import logging
import httpx

logger = logging.getLogger(__name__)


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

    async def get_station_arrivals(self, stop_id: str) -> list[dict]:
        url = f"{self.BASE_URL}/StopPoint/{stop_id}/Arrivals"
        try:
            response = await self._client.get(url, params=self._params())
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Failed to fetch arrivals for stop %s: %s", stop_id, exc)
            return []

    async def aclose(self):
        await self._client.aclose()
