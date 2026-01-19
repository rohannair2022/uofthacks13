# Unscene Gems

Unscene Gems helps users discover **high-quality but overlooked places** by aggregating multiple signals into a single interactive exploration experience. Instead of ranking by popularity, it surfaces locations that are *underrated* and contextually interesting.

---

## Overview

Unscene Gems provides a map-based interface for exploring the world, drilling down into regions and local areas, and uncovering places that typically don't appear on mainstream recommendation platforms.

**Key Innovation:** Parallel AI agent orchestration with consensus-building to analyze locations from 4 different perspectives simultaneously.

---

## How It Works

- The **backend** (Node.js + Express) orchestrates 4 parallel AI agents via OpenRouter API
- Each agent simulates a different data source (local expertise, Reddit, TripAdvisor, news)
- Agents execute concurrently with 10-second timeouts and graceful degradation
- Results are aggregated, consensus is built, and cached for instant re-access
- The **frontend** (React) renders an interactive 3D globe, state panels, and detailed maps
- Real-time POI data is fetched from OpenStreetMap's Overpass API
- Frontend communicates with backend through REST APIs

---

## Agent Orchestration

### Multi-Agent Architecture

Four specialized agents run in parallel using `Promise.all()`:

| Agent | Simulates | Key Insights |
|-------|-----------|--------------|
| **Local Insights** | Expert local knowledge | Hidden gems, authentic spots, what to avoid |
| **Reddit Sentiment** | Community discussions | Insider tips, local complaints/praises, subreddit vibes |
| **TripAdvisor Sentiment** | Tourist reviews | Ratings, review themes, traveler tips, best seasons |
| **News Sentiment** | Media coverage | Current events, trending topics, search interest |

**Execution Flow:**
```
User Request
    ↓
Promise.all([agent1, agent2, agent3, agent4])
    ↓
2-4 seconds → All agents complete
    ↓
Consensus Builder (sentiment analysis)
    ↓
Cached Response → Instant subsequent access
```

**AI Model:** Google Gemini Flash 2.5 (via OpenRouter)
- Temperature: 0.7
- Max tokens: 1000 per agent
- Timeout: 10s with fallback data on failure

---

## Tools & APIs Used

### Backend Stack
- **Express 4.18.2** - REST API server
- **OpenRouter API** - AI model orchestration for parallel agent execution
- **axios 1.6.5** - HTTP client for external API calls
- **dotenv 16.3.1** - Environment variable management

### Frontend Stack
- **React 18.2.0** - UI framework
- **react-globe.gl 2.27.2** - 3D globe visualization (Three.js wrapper)
- **Leaflet 1.9.4** - Interactive 2D maps for detailed exploration
- **Three.js 0.160.0** - 3D rendering engine

### External APIs
- **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`) - Routes requests to Google Gemini Flash 2.5
- **Overpass API** (`https://overpass-api.de/api/interpreter`) - Real-time OpenStreetMap POI queries
- **Nominatim** (`https://nominatim.openstreetmap.org/search`) - Geocoding and global city search
- **Natural Earth** - Country boundary GeoJSON data
- **Countries States Cities DB** - Global administrative divisions CSV

### Key Features
- **Parallel Processing:** All agents execute simultaneously, not sequentially
- **Graceful Degradation:** Failed agents return fallback data; system continues with successful responses
- **Consensus Building:** Analyzes sentiment across all agent responses to determine overall confidence
- **Smart Caching:** In-memory Map structure caches results by `{state},{country}` key
- **Real-time POI Search:** Overpass API queries with dynamic bounding box calculation
- **Global Search:** Nominatim geocoding with 600ms debounce and autocomplete

---

## Screenshots

<p align="left">
  <img src="images/image1.jpg" width="220" style="object-fit: cover;" alt="Globe Exploration"/>
  <img src="images/image3.jpg" width="220" style="object-fit: cover;" alt="Place Intelligence"/>
  <img src="images/image4.jpg" width="220" style="object-fit: cover;" alt="Detailed Map View"/>
  <img src="images/image5.jpg" width="220" style="object-fit: cover;" alt="Insights Panel"/>
</p>

---

## Running the Project

### Prerequisites
- Node.js v14+
- npm v6+
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

### Start the Backend
```bash
cd backend
npm install
```

Create `.env` file:
```env
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

Run server:
```bash
node index.js
```

**Expected output:**
```
✅ API Key loaded: sk-or-v1-...
🕵️ WorldView Parallel Agent System running on port 3001
🚀 4 agents running in parallel: Local, Reddit, TripAdvisor, News
```

### Start the Frontend
```bash
cd frontend/npx
npm install
npm start
```

Application opens at `http://localhost:3000`

---

## API Endpoints

### `GET /api/research?state={state}&country={country}`
Execute all 4 agents in parallel and return aggregated intelligence.

**Response includes:**
- Execution time and timestamp
- Consensus sentiment (positive/negative/neutral) with confidence level
- All 4 agent responses with source attribution
- Local spots (hidden gems, what to avoid)

### `GET /api/agent/:agentName?state={state}`
Execute single agent independently.

**Valid agents:** `local_insights`, `reddit_sentiment`, `tripadvisor_sentiment`, `news_sentiment`

### `GET /health`
Check server status, cache size, and memory usage.

---

## Performance

| Metric | Value |
|--------|-------|
| 4-agent parallel execution | 2-4 seconds |
| Cache hit response | <10ms |
| Overpass POI query | 1-3 seconds |
| Globe rendering | 60 FPS |

---

## Architecture Highlights

**Agent Timeout Protection:**
```javascript
Promise.race([
  executeAgent(prompt, name),
  new Promise(resolve => setTimeout(() => 
    resolve({ success: false, error: 'Timeout' }), 10000))
])
```

**Consensus Algorithm:**
- Extracts sentiment keywords from each agent summary
- Counts positive/negative/neutral responses
- Calculates confidence based on successful agent count (high: 3+, medium: 2, low: 1)

**POI Search:**
- Converts radius (km) to lat/lng degrees
- Adjusts longitude for latitude-based compression: `lon ± radius / cos(lat)`
- Queries Overpass with dynamic bounding box
- Limits results to top 100 by synthetic rating algorithm

---

## License

MIT License

---

**Built for travelers seeking authentic, underrated experiences**
