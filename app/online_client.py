import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


class OnlineClient:
    """Simple async client for OpenAI Chat Completions (or compatible).

    Requires OPENAI_API_KEY in env. The base URL can be overridden with
    OPENAI_API_BASE (useful for proxies or OpenAI-compatible APIs).
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.base_url = base_url or os.environ.get("OPENAI_API_BASE", "https://api.openai.com")
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY not provided for OnlineClient")

        self._client = httpx.AsyncClient(timeout=15.0, headers={
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        })

    async def chat(self, prompt: str) -> str:
        url = f"{self.base_url}/v1/chat/completions"
        body = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 300,
            "temperature": 0.7
        }

        resp = await self._client.post(url, json=body)
        if resp.status_code != 200:
            logger.error("Online API returned status %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Online API error: {resp.status_code}")

        data = resp.json()
        # Expect OpenAI shape
        try:
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.exception("Unexpected response shape from online API: %s", e)
            raise

    async def close(self):
        await self._client.aclose()
