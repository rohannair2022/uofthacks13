const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = "http://localhost:3000"; // Your frontend URL for OpenRouter headers
const SITE_NAME = "WorldView";

// --- CACHE LAYER ---
const cityCache = new Map();

// --- AGENT PROMPT GENERATOR ---
const generatePrompt = (city) => `
You are a grumpy local resident of ${city} who hates tourists. 
A friend has asked you for recommendations. 

TASK:
Provide 4 specific recommendations that are strictly NOT famous tourist attractions.
- If it's Paris, DO NOT mention the Eiffel Tower or Louvre.
- If it's New York, DO NOT mention Times Square.
- Focus on: Hidden speakeasies, specific street food stalls, odd museums, local parks.

RETURN JSON ONLY. Do not use Markdown formatting (\`\`\`json). Just the raw JSON object:
{
  "summary": "One sentence summary of the city's *real* vibe",
  "spots": [
    {
      "name": "Name of place",
      "type": "Bar/Park/Food",
      "why_locals_go": "Why it's cool",
      "tourist_trap_to_avoid": "The famous alternative to avoid"
    }
  ]
}
`;

app.get('/api/research', async (req, res) => {
    const { city } = req.query;

    if (!city) return res.status(400).json({ error: "City required" });

    // 1. Check Cache
    if (cityCache.has(city)) {
        console.log(`[CACHE HIT] Returning data for ${city}`);
        return res.json(cityCache.get(city));
    }

    console.log(`[AGENT] contacting Gemini via OpenRouter for: ${city}...`);

    try {
        // 2. Call OpenRouter (Gemini Model)
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001", // Using the fast Gemini Flash model
                "messages": [
                    {
                        "role": "user",
                        "content": generatePrompt(city)
                    }
                ]
            })
        });

        const data = await response.json();

        // Error handling for the API response
        if (data.error) {
            console.error("OpenRouter API Error:", data.error);
            throw new Error(data.error.message);
        }

        // 3. Parse and Clean Response
        let rawContent = data.choices[0].message.content;
        
        // Remove markdown code blocks if the model adds them
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '');
        
        const parsedData = JSON.parse(rawContent);

        // 4. Cache and Return
        cityCache.set(city, parsedData);
        res.json(parsedData);

    } catch (error) {
        console.error("Agent Failed:", error);
        res.status(500).json({ 
            summary: " The local expert is ignoring us right now.", 
            spots: [] 
        });
    }
});

app.listen(3001, () => console.log('🕵️  WorldView Agent (OpenRouter/Gemini) running on port 3001'));