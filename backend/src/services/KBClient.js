const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity'); // Will need to npm install string-similarity

class KBClient {
    constructor(dataPath = null) {
        this.dataPath = dataPath || path.join(__dirname, '../../data', 'responses.json');
        this.entries = [];
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                this.entries = data.entries || [];
            } else {
                console.warn("responses.json not found:", this.dataPath);
                this.entries = [];
            }
        } catch (error) {
            console.error("Error loading responses:", error);
            this.entries = [];
        }

        // Precompute searchable text
        this.entries.forEach(entry => {
            const kws = entry.keywords || [];
            const combined = `${kws.join(' ')} ${entry.response || ''}`;
            entry._search_text = combined.toLowerCase();
        });
    }

    reload() {
        this.load();
    }

    query(text) {
        const textLower = text.toLowerCase();
        let best = null;
        let bestScore = 0;

        for (const entry of this.entries) {
            const keywords = entry.keywords || [];
            const kwScore = keywords.reduce((score, kw) => score + (textLower.includes(kw) ? 1 : 0), 0);
            
            let seqScore = 0;
            if (entry._search_text) {
                // simple substring/likeness similarity using string-similarity package
                seqScore = stringSimilarity.compareTwoStrings(textLower, entry._search_text);
            }

            const score = (kwScore * 2.0) + (seqScore * 2.0);

            if (score > bestScore) {
                bestScore = score;
                best = entry;
            }
        }

        if (bestScore > 0 && best) return best;

        // fallback to default entry (empty keywords)
        for (const entry of this.entries) {
            if (!entry.keywords || entry.keywords.length === 0) {
                return entry;
            }
        }

        return { response: "I'm here to listen.", risk_level: "low" };
    }
}

module.exports = KBClient;
