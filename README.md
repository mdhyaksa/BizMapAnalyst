# BizMap Analyst

AI-powered business location intelligence. Describe a business idea, pin a location on the map, and get a detailed report analyzing nearby competition, customer segments, failure risks, and an overall location score — all powered by Google Places and Gemini AI.

## How It Works

1. **Pin a location** — click anywhere on the map, or search for an address using the search bar
2. **Set a search radius** — adjust the slider (500m–10km, default 1km)
3. **Describe your business** — enter your concept, target customers, and what makes it unique
4. **Generate Report** — the app:
   - Calls Gemini AI, which decides what nearby place types to search for (up to 5 queries)
   - Fetches real nearby places via Google Places API (New)
   - Feeds the results back to Gemini to generate a structured Markdown report

### Report Sections

- **Executive Summary** — 2–3 sentence overview of location viability
- **Customer Segments** — 3–5 segments with product expectations, volume, spending habits, peak hours
- **Market Saturation** — competitor analysis with Low/Medium/High rating
- **Major Failure Modes** — brutally honest top risks for this location
- **Strategies to Combat Failures** — concrete, actionable mitigations
- **Location Score** — 1–10 rating with justification

## Architecture

```
src/
├── routes/
│   ├── +page.svelte          # Main dashboard UI
│   ├── +layout.svelte        # Root layout
│   └── api/report/+server.ts # POST /api/report — orchestrates geocoding + AI
├── lib/
│   ├── components/
│   │   ├── Map.svelte         # Google Maps JS API (dynamic import, SSR-safe)
│   │   ├── SearchBar.svelte   # Places Autocomplete overlay on map
│   │   ├── RadiusControl.svelte
│   │   └── Report.svelte      # Renders Markdown report + place pills
│   ├── server/
│   │   ├── ai-report.ts       # Gemini multi-turn tool-use flow
│   │   ├── google-places.ts   # Places API (New) — searchNearby + searchNearbyText
│   │   └── geocoding.ts       # Reverse geocode coordinates → address
│   ├── stores/
│   │   └── map-state.svelte.ts # Svelte 5 runes-based global state
│   └── types.ts
```

**Stack:** SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind CSS v4 · Vercel adapter

**AI flow (`ai-report.ts`):**
1. First Gemini call — model receives the business description and location, then calls `search_nearby_places` tool with up to 5 queries
2. Queries are executed against Google Places API (New)
3. Second Gemini call — results are fed back; model generates the full Markdown report

> Gemini 3.1 is a thinking model. Its first response includes a `thought_signature` in the function call parts. The full `candidate.content.parts` array must be echoed back verbatim in the second call, or the API returns a 400 error.

## Prerequisites

- Node.js 18+
- A Google Cloud project with these APIs enabled:
  - **Maps JavaScript API** (client-side map rendering)
  - **Places API (New)** (server-side nearby search)
  - **Geocoding API** (server-side reverse geocoding)
- A **Gemini API key** with access to `gemini-3.1-flash-lite-preview`

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
```

Edit `.env`:

```env
# Server-side Google API key — needs Places API (New) + Geocoding API enabled
GOOGLE_API_KEY=your-server-side-google-api-key

# Client-side Maps JS API key — needs Maps JavaScript API + Places API enabled
# Restrict this key to HTTP referrers (your domain) in GCP Console
VITE_GOOGLE_MAPS_CLIENT_KEY=your-client-side-maps-api-key

# Gemini API key
GEMINI_API_KEY=your-gemini-api-key
```

```bash
# 3. Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deployment (Vercel)

The project uses `@sveltejs/adapter-vercel` and deploys with zero config.

```bash
npm run build   # verify build locally
```

**In Vercel:**
1. Import the GitHub repository
2. Add the three environment variables (`GOOGLE_API_KEY`, `VITE_GOOGLE_MAPS_CLIENT_KEY`, `GEMINI_API_KEY`) in Project Settings → Environment Variables
3. Deploy

### GCP API Key Security

- **`VITE_GOOGLE_MAPS_CLIENT_KEY`** — restrict to HTTP referrers (your Vercel domain + `localhost:*` for dev)
- **`GOOGLE_API_KEY`** — restrict to IP addresses (Vercel's egress IPs) or leave unrestricted and rely on API-level restrictions; enable only Places API (New) and Geocoding API

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run check` | Svelte type-check |
