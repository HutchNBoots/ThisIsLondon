import logging
import httpx

logger = logging.getLogger(__name__)

LONDON_KEYWORDS = [
    'London', 'Underground', 'Victoria', 'Brixton', 'Stockwell',
    'Oval', 'Vauxhall', 'Pimlico', 'Westminster', 'Green Park',
    'Oxford Circus', 'Warren Street', 'Euston', "King's Cross",
    'Highbury', 'Finsbury', 'Seven Sisters', 'Tottenham', 'Walthamstow',
    'District', 'Hammersmith', 'Fulham', 'Kensington', 'Chelsea',
    'Paddington', 'Whitechapel', 'Stepney', 'Tower Hamlets', 'Mile End',
    'Bow', 'Barking', 'Dagenham', 'Upminster', 'Ealing', 'Acton',
    'Richmond', 'Putney', 'Wimbledon', 'Merton', 'Wandsworth',
    "Earl's Court", 'Gloucester Road', 'South Kensington',
    'Sloane Square', 'Embankment', 'Temple', 'Blackfriars', 'Mansion House',
    'Cannon Street', 'Monument', 'Tower Hill', 'Newham', 'Plaistow',
    'Becontree', 'Hornchurch', 'Havering', 'Hounslow', 'Chiswick',
    # Central line
    'Central', 'Shepherd', 'Holland Park', 'Notting Hill', 'Queensway',
    'Lancaster Gate', 'Marble Arch', 'Bond Street', 'Holborn', 'Chancery',
    "St Paul's", 'Bank', 'Liverpool Street', 'Bethnal Green', 'Stratford',
    'Leyton', 'Leytonstone',
    # Jubilee line
    'Jubilee', 'Stanmore', 'Canons Park', 'Queensbury', 'Kingsbury',
    'Neasden', 'Dollis Hill', 'Willesden', 'Kilburn', 'West Hampstead',
    'Finchley Road', 'Swiss Cottage', "St John's Wood", 'Baker Street',
    'Southwark', 'London Bridge', 'Bermondsey', 'Canada Water',
    'Canary Wharf', 'North Greenwich', 'Canning Town',
    # Northern line
    'Northern', 'Morden', 'Colliers Wood', 'Tooting', 'Balham', 'Clapham',
    'Kennington', 'Borough', 'Moorgate', 'Old Street', 'Angel',
    'Camden', 'Chalk Farm', 'Belsize Park', 'Hampstead', 'Golders Green',
    'Brent Cross', 'Hendon', 'Edgware', 'Oval',
]

ACTIVE_LINES = ["victoria", "district", "central", "jubilee", "northern"]


class TfLClient:
    BASE_URL = "https://api.tfl.gov.uk"

    def __init__(self, app_key: str):
        self._app_key = app_key
        self._client = httpx.AsyncClient(timeout=10.0)

    def _params(self) -> dict:
        if self._app_key:
            return {"app_key": self._app_key}
        return {}

    async def _get_line_arrivals(self, line: str) -> list[dict]:
        url = f"{self.BASE_URL}/Line/{line}/Arrivals"
        try:
            response = await self._client.get(url, params=self._params())
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Failed to fetch %s arrivals: %s", line, exc)
            return []

    async def get_all_arrivals(self) -> dict[str, list[dict]]:
        """Fetch arrivals for all active lines concurrently."""
        import asyncio
        tasks = {line: self._get_line_arrivals(line) for line in ACTIVE_LINES}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        return {
            line: (result if not isinstance(result, Exception) else [])
            for line, result in zip(tasks.keys(), results)
        }

    # Keep legacy methods for compatibility
    async def get_victoria_arrivals(self) -> list[dict]:
        return await self._get_line_arrivals("victoria")

    async def get_district_arrivals(self) -> list[dict]:
        return await self._get_line_arrivals("district")

    async def get_station_arrivals(self, stop_id: str) -> list[dict]:
        url = f"{self.BASE_URL}/StopPoint/{stop_id}/Arrivals"
        try:
            response = await self._client.get(url, params=self._params())
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Failed to fetch arrivals for stop %s: %s", stop_id, exc)
            return []

    async def get_line_status(self) -> list[dict]:
        lines = ",".join(ACTIVE_LINES)
        url = f"{self.BASE_URL}/Line/{lines}/Status"
        try:
            response = await self._client.get(url, params=self._params())
            response.raise_for_status()
            data = response.json()
            result = []
            for line_data in data:
                line_id = line_data.get("id", "")
                statuses = line_data.get("lineStatuses", [])
                for s in statuses:
                    severity = s.get("statusSeverity", 10)
                    description = s.get("statusSeverityDescription", "Good Service")
                    reason = s.get("reason", "")
                    result.append({
                        "line": line_id,
                        "severity": severity,
                        "description": description,
                        "reason": reason[:200] if reason else "",
                        "disrupted": severity < 10,
                    })
                    break  # take worst status only
            return result
        except Exception as exc:
            logger.error("Failed to fetch line status: %s", exc)
            return []

    async def get_on_this_day(self, month: int, day: int) -> list[dict]:
        url = f"https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/{month:02d}/{day:02d}"
        try:
            response = await self._client.get(
                url,
                headers={"User-Agent": "ThisIsLondon/2.0 (data-art-installation)"},
                timeout=8.0,
            )
            response.raise_for_status()
            data = response.json()
            events = data.get("events", [])
            matched = []
            for event in events:
                text = event.get("text", "")
                if any(kw.lower() in text.lower() for kw in LONDON_KEYWORDS):
                    matched.append({"year": event.get("year"), "text": text})
            return matched
        except Exception as exc:
            logger.error("Failed to fetch Wikipedia On This Day: %s", exc)
            return []

    async def aclose(self):
        await self._client.aclose()
