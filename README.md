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

The app ships with **synthetic** data (labeled "Demo data" in the header) so it
works before any real results exist.

## Data

The four files in `app/public/data/` follow [docs/data_contract.md](docs/data_contract.md).

```bash
# Synthetic data, no dependencies (what is committed now)
python data_pipeline/export_web_data.py --synthetic

# v0 mock data from real block groups and real OSM courts and fields
pip install -r data_pipeline/requirements.txt
python data_pipeline/export_web_data.py --mock
```

`--mock` walking times are straight-line placeholders, not the access model's
results. `--from-db` will export the real results once the team's PostGIS
tables exist.

## Deploy (Vercel)

1. Import this repo at vercel.com.
2. Set **Root Directory** to `app`. Vercel detects Vite; the defaults
   (`npm run build`, output `dist`) work.
3. Every push to `main` redeploys.

## Stack

React 18 and Vite, MapLibre GL JS through react-map-gl, and an OpenFreeMap
basemap (no API key; set in `app/src/config.js`).
