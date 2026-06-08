"""Tests for backend.tfl module."""
import pytest
import respx
import httpx

from backend.tfl import TfLClient, ACTIVE_LINES

TFL_BASE = "https://api.tfl.gov.uk"


@pytest.fixture()
async def client():
    c = TfLClient("")
    yield c
    await c.aclose()


@pytest.mark.anyio
async def test_get_line_arrivals_returns_empty_on_http_error(client):
    with respx.mock:
        respx.get(f"{TFL_BASE}/Line/victoria/Arrivals").mock(
            return_value=httpx.Response(500)
        )
        result = await client._get_line_arrivals("victoria")
    assert result == []


@pytest.mark.anyio
async def test_get_line_arrivals_returns_empty_on_network_error(client):
    with respx.mock:
        respx.get(f"{TFL_BASE}/Line/central/Arrivals").mock(
            side_effect=httpx.ConnectError("connection refused")
        )
        result = await client._get_line_arrivals("central")
    assert result == []


@pytest.mark.anyio
async def test_get_line_status_parses_severity(client):
    payload = [
        {
            "id": "victoria",
            "lineStatuses": [
                {
                    "statusSeverity": 6,
                    "statusSeverityDescription": "Minor Delays",
                    "reason": "Signal failure",
                }
            ],
        },
        {
            "id": "district",
            "lineStatuses": [
                {
                    "statusSeverity": 10,
                    "statusSeverityDescription": "Good Service",
                    "reason": "",
                }
            ],
        },
    ]
    lines_joined = ",".join(ACTIVE_LINES)
    with respx.mock:
        respx.get(f"{TFL_BASE}/Line/{lines_joined}/Status").mock(
            return_value=httpx.Response(200, json=payload)
        )
        result = await client.get_line_status()

    assert len(result) == 2

    vic = next(r for r in result if r["line"] == "victoria")
    assert vic["severity"] == 6
    assert vic["disrupted"] is True

    dist = next(r for r in result if r["line"] == "district")
    assert dist["severity"] == 10
    assert dist["disrupted"] is False


@pytest.mark.anyio
async def test_get_line_status_returns_empty_on_error(client):
    lines_joined = ",".join(ACTIVE_LINES)
    with respx.mock:
        respx.get(f"{TFL_BASE}/Line/{lines_joined}/Status").mock(
            return_value=httpx.Response(503)
        )
        result = await client.get_line_status()
    assert result == []


def test_active_lines_contains_expected():
    expected = {"victoria", "district", "central", "jubilee", "northern"}
    assert expected.issubset(set(ACTIVE_LINES))
