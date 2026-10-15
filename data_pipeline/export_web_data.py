"""Write the four PlayMap web data files described in docs/data_contract.md.

Modes:
  --synthetic  Fake Detroit-shaped data for UI work. Standard library only, no
               network. This is what ships in app/public/data until real data exists.
  --mock       v0 mock data from real sources: Detroit block groups (TIGER via
               pygris) and real OSM courts and fields (osmnx). Walking times are
               straight-line placeholders, NOT the access model's results.
  --from-db    Real results from the team's PostGIS inventory (to be written
               once the access and finance model's tables exist).

Usage:
  python data_pipeline/export_web_data.py --synthetic
  python data_pipeline/export_web_data.py --mock
"""

import argparse
import json
import math
import random
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "app" / "public" / "data"

SPORTS = ["tennis", "basketball", "soccer", "baseball_softball", "football"]
WALK_THRESHOLD_MIN = 10

# Fields every block group must carry (see docs/data_contract.md).
BLOCK_GROUP_FIELDS = [
    "geoid", "neighborhood", "council_district", "population", "youth_population",
    "median_income", "access_score", "profile",
] + [f"walk_min_{s}" for s in SPORTS]
FACILITY_FIELDS = ["facility_id", "sport", "source", "is_public", "park_name", "confidence"]
RECOMMENDATION_FIELDS = [
    "scenario", "rank", "site_id", "geoid", "sport", "cost_low", "cost_typical",
    "cost_high", "cost_10yr", "residents_served", "youth_served", "cost_per_resident",
]


def access_score(props):
    """Count of facility types within a 10-minute walk; None if any time is unknown."""
    times = [props[f"walk_min_{s}"] for s in SPORTS]
    if any(t is None for t in times):
        return None
    return sum(t <= WALK_THRESHOLD_MIN for t in times)


def validate(block_groups, facilities, recommendations):
    """Fail loudly if a file is missing a contract field, so the app never breaks silently."""
    for name, rows, fields in [
        ("block_groups", [f["properties"] for f in block_groups["features"]], BLOCK_GROUP_FIELDS),
        ("facilities", [f["properties"] for f in facilities["features"]], FACILITY_FIELDS),
        ("recommendations", recommendations, RECOMMENDATION_FIELDS),
    ]:
        for i, row in enumerate(rows):
            missing = [k for k in fields if k not in row]
            if missing:
                raise ValueError(f"{name} row {i} is missing fields: {missing}")
        sports = {r["sport"] for r in rows if "sport" in r}
        if not sports <= set(SPORTS):
            raise ValueError(f"{name} has unknown sports: {sports - set(SPORTS)}")


def write_all(block_groups, facilities, recommendations, summary):
    validate(block_groups, facilities, recommendations)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = {
        "block_groups.geojson": block_groups,
        "facilities.geojson": facilities,
        "recommendations.json": recommendations,
        "city_summary.json": summary,
    }
    for name, obj in files.items():
        path = OUT_DIR / name
        path.write_text(json.dumps(obj, separators=(",", ":")))
        print(f"wrote {path.relative_to(OUT_DIR.parent.parent.parent)} ({path.stat().st_size:,} bytes)")


# --------------------------------------------------------------------------
# Synthetic data (no dependencies)
# --------------------------------------------------------------------------

# Rough rectangle around Detroit for fake data only; real boundaries come from TIGER.
SYN_BBOX = (-83.28, 42.26, -82.92, 42.45)


def _meters(lon1, lat1, lon2, lat2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def build_synthetic(seed=498):
    rng = random.Random(seed)
    west, south, east, north = SYN_BBOX
    cols, rows = 14, 9
    dx, dy = (east - west) / cols, (north - south) / rows

    facilities = []
    for i in range(450):
        sport = rng.choice(SPORTS)
        facilities.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [
                round(rng.uniform(west, east), 5), round(rng.uniform(south, north), 5)]},
            "properties": {
                "facility_id": f"syn-{i:04d}", "sport": sport,
                "source": rng.choice(["osm", "osm", "model", "both"]),
                "is_public": rng.random() > 0.15, "park_name": None, "confidence": None,
            },
        })

    features = []
    for r in range(rows):
        for c in range(cols):
            x0, y0 = west + c * dx, south + r * dy
            cx, cy = x0 + dx / 2, y0 + dy / 2
            props = {
                "geoid": f"SYN{r:02d}{c:02d}",
                "neighborhood": f"Synthetic area {chr(65 + r)}{c + 1}",
                "council_district": None,
                "population": rng.randint(600, 3000),
                "median_income": None,
                "profile": None,
            }
            props["youth_population"] = int(props["population"] * rng.uniform(0.15, 0.35))
            for s in SPORTS:
                public = [f for f in facilities if f["properties"]["sport"] == s and f["properties"]["is_public"]]
                d = min(_meters(cx, cy, *f["geometry"]["coordinates"]) for f in public)
                props[f"walk_min_{s}"] = round(d / 80, 1)  # assumed walking speed of 80 m/min
            props["access_score"] = access_score(props)
            ring = [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy], [x0, y0]]
            ring = [[round(x, 5), round(y, 5)] for x, y in ring]
            features.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [ring]},
                             "properties": props})

    # Costs stay null: they are only filled from cited sources.
    recommendations = []
    gaps = [f["properties"] for f in features if f["properties"]["access_score"] <= 1]
    for rank, p in enumerate(gaps[:20], start=1):
        missing = [s for s in SPORTS if p[f"walk_min_{s}"] > WALK_THRESHOLD_MIN]
        recommendations.append({
            "scenario": "full_gap_closure", "rank": rank, "site_id": f"syn-site-{rank:03d}",
            "geoid": p["geoid"], "sport": missing[0], "cost_low": None, "cost_typical": None,
            "cost_high": None, "cost_10yr": None, "residents_served": None,
            "youth_served": None, "cost_per_resident": None,
        })

    summary = {
        "data_version": "v0-synthetic",
        "note": "Synthetic data for building the app. Not real Detroit results.",
        "naip_year": None, "acs_years": None,
        "benchmark_spend_per_resident": {"detroit": 139, "top_100_cities": 154,
                                         "source": "Trust for Public Land, via the team's goals document"},
        "scenarios": {},
    }
    return ({"type": "FeatureCollection", "features": features},
            {"type": "FeatureCollection", "features": facilities}, recommendations, summary)


# --------------------------------------------------------------------------
# v0 mock data from real sources (needs geopandas, osmnx, pygris and network)
# --------------------------------------------------------------------------

OSM_SPORT_MAP = {
    "tennis": "tennis", "basketball": "basketball", "soccer": "soccer",
    "baseball": "baseball_softball", "softball": "baseball_softball",
    "american_football": "football",
}


def _osm_sport(tag):
    if not isinstance(tag, str):
        return None
    for part in tag.split(";"):
        if part.strip() in OSM_SPORT_MAP:
            return OSM_SPORT_MAP[part.strip()]
    return None


def build_mock(year=2023):
    import geopandas as gpd
    import osmnx as ox
    import pygris

    utm = "EPSG:32617"  # UTM zone 17N, meters

    detroit = pygris.places(state="MI", year=year, cb=True)
    detroit = detroit[detroit["NAME"] == "Detroit"].to_crs(utm)
    bgs = pygris.block_groups(state="MI", county="Wayne", year=year, cb=True).to_crs(utm)
    bgs = bgs[bgs.representative_point().within(detroit.unary_union)].copy()

    pitches = ox.features_from_place("Detroit, Michigan, USA", tags={"leisure": "pitch"})
    pitches["sport"] = pitches.get("sport").map(_osm_sport)
    pitches = pitches[pitches["sport"].notna()].to_crs(utm)
    pitches["geometry"] = pitches.geometry.representative_point()
    pitches = pitches.reset_index()

    pts = bgs.representative_point()
    for s in SPORTS:
        sub = pitches[pitches["sport"] == s]
        if sub.empty:
            bgs[f"walk_min_{s}"] = None
            continue
        # Straight-line placeholder at an assumed 80 m/min; the access model replaces this.
        bgs[f"walk_min_{s}"] = pts.apply(lambda p: sub.distance(p).min() / 80).round(1)

    bg_props = []
    for _, row in bgs.iterrows():
        p = {"geoid": row["GEOID"], "neighborhood": None, "council_district": None,
             "population": None, "youth_population": None, "median_income": None, "profile": None}
        for s in SPORTS:
            v = row[f"walk_min_{s}"]
            p[f"walk_min_{s}"] = None if v is None else float(v)
        p["access_score"] = access_score(p)
        bg_props.append(p)

    bgs_out = gpd.GeoDataFrame(bg_props, geometry=bgs.geometry.simplify(15).values, crs=utm).to_crs(4326)
    fac = gpd.GeoDataFrame({
        "facility_id": [f"osm-{t}-{i}" for t, i in zip(pitches["element"], pitches["id"])],
        "sport": pitches["sport"], "source": "osm", "is_public": True,
        "park_name": pitches.get("name"), "confidence": None,
    }, geometry=pitches.geometry, crs=utm).to_crs(4326)

    summary = {
        "data_version": "v0-mock",
        "note": "Real block groups and OSM facilities; walking times are straight-line placeholders.",
        "naip_year": None, "acs_years": None,
        "benchmark_spend_per_resident": {"detroit": 139, "top_100_cities": 154,
                                         "source": "Trust for Public Land, via the team's goals document"},
        "scenarios": {},
    }
    return (json.loads(bgs_out.to_json(drop_id=True)), json.loads(fac.to_json(drop_id=True)), [], summary)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--synthetic", action="store_true")
    mode.add_argument("--mock", action="store_true")
    mode.add_argument("--from-db", action="store_true")
    args = parser.parse_args()

    if args.synthetic:
        write_all(*build_synthetic())
    elif args.mock:
        write_all(*build_mock())
    else:
        raise SystemExit("--from-db is not written yet: it needs the access and finance model's tables.")


if __name__ == "__main__":
    main()
