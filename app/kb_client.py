import json
from pathlib import Path
from typing import Dict, List, Optional
from difflib import SequenceMatcher


class KBClient:
    def __init__(self, data_path: Optional[Path] = None):
        base = Path(__file__).resolve().parent
        self.data_path = data_path or (base / "data" / "responses.json")
        self.entries: List[Dict] = []
        self._load()

    def _load(self):
        try:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.entries = data.get('entries', [])
        except Exception:
            self.entries = []

        # Precompute a searchable text for each entry
        for entry in self.entries:
            kws = entry.get('keywords', []) or []
            combined = ' '.join(kws) + ' ' + entry.get('response', '')
            entry['_search_text'] = combined.lower()

    def reload(self):
        """Reload the dataset from disk."""
        self._load()

    def query(self, text: str) -> Dict:
        """Return the best matching entry for the text using fuzzy matching.

        Scoring combines keyword overlap and sequence similarity. Returns the best
        entry or a default fallback if nothing matches well.
        """
        text_lower = text.lower()

        best = None
        best_score = 0.0

        for entry in self.entries:
            # keyword overlap score
            keywords = entry.get('keywords', []) or []
            kw_score = sum(1 for kw in keywords if kw in text_lower)

            # sequence similarity against precomputed text
            search_text = entry.get('_search_text', '')
            seq = 0.0
            if search_text:
                seq = SequenceMatcher(None, text_lower, search_text).ratio()

                # combine scores: weight both keyword overlap and sequence similarity
                score = kw_score * 2.0 + seq * 2.0

            if score > best_score:
                best_score = score
                best = entry

        # Always return the best match if one exists; prefer non-empty keyword entries
        if best:
            return best

        # fallback to default entry (empty keywords) or a simple reply
        for entry in self.entries:
            if not entry.get('keywords'):
                return entry

        return {"response": "I'm here to listen.", "risk_level": "low"}
