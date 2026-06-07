import logging
import httpx

logger = logging.getLogger(__name__)

LONDON_KEYWORDS = [
    # Victoria line
    'London', 'Underground', 'Victoria', 'Brixton', 'Stockwell',
    'Oval', 'Vauxhall', 'Pimlico', 'Westminster', 'Green Park',
    'Oxford Circus', 'Warren Street', 'Euston', "King's Cross",
    'Highbury', 'Finsbury', 'Seven Sisters', 'Tottenham', 'Walthamstow',
    # District line boroughs and stations
    'District', 'Hammersmith', 'Fulham', 'Kensington', 'Chelsea',
    'Paddington', 'Whitechapel', 'Stepney', 'Tower Hamlets', 'Mile End',
    'Bow', 'Barking', 'Dagenham', 'Upminster', 'Ealing', 'Acton',
    'Richmond', 'Putney', 'Wimbledon', 'Merton', 'Wandsworth',
    "Earl's Court", 'Earls Court', 'Gloucester Road', 'South Kensington',
    'Sloane Square', 'Embankment', 'Temple', 'Blackfriars', 'Mansion House',
    'Cannon Street', 'Monument', 'Tower Hill', 'Newham', 'Plaistow',
    'Becontree', 'Hornchurch', 'Havering', 'Hounslow', 'Chiswick',
]


class TfLClient:
    BASE_URL = "https://api.tfl.gov.uk"

    def __init__(self, app_key: str):
        self._app_key = app_key
        self._client = httpx.AsyncClient(timeout=10.0)

    def _params(self) -> dict:
        if self._app_key:
            return {"app_key": self._app_key}
        return {}

    async def get_victoria_arrivals(self) -> list[dict]:
        url = f"{self.BASE_URL}/Line/victoria/Arrivals"
        try:
            response = await self._client.get(url, params=self._params())
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Failed to fetch Victoria Line arrivals: %s", exc)
            return []

    async def get_district_arrivals(self) -> list[dict]:
        url = f"{self.BASE_URL}/Line/district/Arrivals"
        try:
            response = await self._client.get(url, params=self._params())
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Failed to fetch District Line arrivals: %s", exc)
            return []

    async def get_station_arrivals(self, stop_id: str) -> list[dict]:
        url = f"{self.BASE_URL}/StopPoint/{stop_id}/Arrivals"
        try:
            response = await self._client.get(url, params=self._params())
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Failed to fetch arrivals for stop %s: %s", stop_id, exc)
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
                    matched.append({
                        "year": event.get("year"),
                        "text": text,
                    })
            return matched
        except Exception as exc:
            logger.error("Failed to fetch Wikipedia On This Day: %s", exc)
            return []

    async def aclose(self):
        await self._client.aclose()
