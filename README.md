# PlayMap

PlayMap shows which Detroit neighborhoods can reach courts and fields within a
10-minute walk, and what closing the gaps would cost. Open Court Analytics,
MSDS 498 capstone.

This repo holds the customer-facing app (`app/`) and the script that turns the
team's model results into the app's data files (`data_pipeline/`).

## Run the app

Needs Node 18 or newer.

```bash
cd app
npm install
npm run dev
```

Open the printed URL. To test on your phone, run `npm run dev -- --host` and
open the Network URL on a phone on the same Wi-Fi.

The app ships with the access and finance model's first results (v1, OSM
facilities only), labeled "Preliminary" in the header.

## Data

The four files in `app/public/data/` follow [docs/data_contract.md](docs/data_contract.md).

```bash
# Real results: point at the folder of access and finance model outputs
python data_pipeline/export_web_data.py --from-model path/to/outputs --version v1

# Synthetic data, no dependencies
python data_pipeline/export_web_data.py --synthetic

# v0 mock data from real block groups and real OSM courts and fields
pip install -r data_pipeline/requirements.txt
python data_pipeline/export_web_data.py --mock
```

`--from-model` reads `block_groups_access.geojson`, `facilities_used.geojson`,
`recommended_sites.geojson`/`.csv` and the summary CSVs. It stops with a list
of problems if a GEOID, coordinate, or field doesn't match the contract.

## Deploy (Vercel)

1. Import this repo at vercel.com.
2. Set **Root Directory** to `app`. Vercel detects Vite; the defaults
   (`npm run build`, output `dist`) work.
3. Every push to `main` redeploys.

## Stack

React 18 and Vite, MapLibre GL JS through react-map-gl, and an OpenFreeMap
basemap (no API key; set in `app/src/config.js`).
