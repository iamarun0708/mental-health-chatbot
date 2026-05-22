import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


class DeepSeekClient:
    """Lightweight async client for a local DeepSeek R1 service.

    This client is intentionally permissive about request/response shapes so it
    can work with slightly different local setups. Configure the base URL via
    the `base_url` argument (for example: http://localhost:8001).
    """

    def __init__(self, base_url: str, timeout: float = 6.0):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self._client = httpx.AsyncClient(timeout=self.timeout)

    async def query(self, text: str) -> str:
        """Query the DeepSeek service and return a text answer.

        Tries a few common endpoint patterns and response shapes. Raises
        RuntimeError on failure.
        """
        endpoints = [
            f"{self.base_url}/query",
            f"{self.base_url}/v1/query",
            f"{self.base_url}/generate",
            f"{self.base_url}/v1/generate",
            f"{self.base_url}"
        ]

        payloads = [
            {"query": text},
            {"prompt": text},
            {"input": text},
            {"text": text}
        ]

        for endpoint in endpoints:
            for payload in payloads:
                try:
                    resp = await self._client.post(endpoint, json=payload)
                except Exception as e:
                    logger.debug("DeepSeek request failed (%s): %s", endpoint, e)
                    continue

                if resp.status_code != 200:
                    logger.debug("DeepSeek returned status %s for %s", resp.status_code, endpoint)
                    continue

                # Try to parse JSON and find common fields
                try:
                    data = resp.json()
                except Exception:
                    # If service returns plain text, return it
                    text_resp = resp.text.strip()
                    if text_resp:
                        return text_resp
                    continue

                # Common keys
                for key in ("answer", "response", "text", "result"):
                    if isinstance(data, dict) and key in data and isinstance(data[key], str):
                        return data[key]

                # If 'results' is a list of objects with 'text'
                if isinstance(data, dict) and "results" in data and isinstance(data["results"], list):
                    for item in data["results"]:
                        if isinstance(item, dict) and "text" in item:
                            return item["text"]

                # If 'choices' like OpenAI-like responses
                if isinstance(data, dict) and "choices" in data and isinstance(data["choices"], list):
                    first = data["choices"][0]
                    if isinstance(first, dict):
                        for key in ("text", "message", "response"):
                            if key in first and isinstance(first[key], str):
                                return first[key]

                # If data itself is a string
                if isinstance(data, str):
                    return data

        raise RuntimeError("DeepSeek service did not return a usable response")

    async def close(self):
        await self._client.aclose()
