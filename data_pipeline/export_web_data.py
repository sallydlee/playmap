"""Write the four PlayMap web data files described in docs/data_contract.md.

Modes:
  --from-model DIR  Real results from the access and finance model's output
                    folder (block_groups_access.geojson, recommended_sites.csv,
                    and the rest, as described in that folder's README.md).
  --synthetic       Fake Detroit-shaped data for UI work. Standard library only,
                    no network.
  --mock            Real Detroit block groups (TIGER via pygris) and real OSM
                    courts and fields (osmnx). Walking times are straight-line
                    placeholders, NOT the access model's results.

  --detections FILE With --from-model: add the computer vision model's
                    detections GeoJSON (detroit_detections_CITY.geojson) to
                    the facilities layer, inside city limits only. They are
                    marked counts_for_access=false because the access model
                    has not been rerun with them.

Usage:
  python data_pipeline/export_web_data.py --from-model /path/to/outputs --version v1
  python data_pipeline/export_web_data.py --from-model /path/to/outputs --version v2 \
      --detections /path/to/detroit_detections_CITY.geojson
  python data_pipeline/export_web_data.py --synthetic
  python data_pipeline/export_web_data.py --mock
"""

import argparse
import csv
import json
import math
import random
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "app" / "public" / "data"

# Facility types, named as the detection and access models name them.
FACILITY_TYPES = ["tennis_court", "basketball_court", "rectangular_field", "baseball_diamond"]

# The access model defines a 10-minute walk as 805 m along the walking network,
# so walking minutes are meters / 80.5.
WALK_THRESHOLD_MIN = 10
WALK_THRESHOLD_M = 805
METERS_PER_MIN = WALK_THRESHOLD_M / WALK_THRESHOLD_MIN

# Fields every row must carry (see docs/data_contract.md).
BLOCK_GROUP_FIELDS = [
    "geoid", "neighborhood", "council_district", "population", "youth_population",
    "median_income", "pct_youth", "pct_black", "pct_hispanic", "access_score",
    "score_5min", "score_15min", "score_excl_school", "profile",
] + [f"walk_min_{t}" for t in FACILITY_TYPES]
FACILITY_FIELDS = [
    "facility_id", "sport", "source", "on_school_grounds", "counts_for_access",
    "park_name", "confidence",
]
RECOMMENDATION_FIELDS = [
    "scenario", "rank", "site_id", "park_id", "park_name", "geoids", "sport",
    "cost_low", "cost_typical", "cost_high", "maint_annual", "cost_10yr",
    "residents_served", "youth_served", "cost_per_resident", "lon", "lat",
]
SCENARIOS = {"full_gap_closure", "fixed_annual_budget", "youth_first"}

# Generous box around Detroit; a point outside it means a projection mistake.
DETROIT_BOX = (-83.40, 42.20, -82.85, 42.50)

BENCHMARK = {
    "detroit": 139, "top_100_cities": 154,
    "source": "Trust for Public Land, via the team's goals document",
}


def access_score(props):
    """Count of facility types within a 10-minute walk; None if any time is unknown."""
    times = [props[f"walk_min_{t}"] for t in FACILITY_TYPES]
    if any(t is None for t in times):
        return None
    return sum(t <= WALK_THRESHOLD_MIN for t in times)


def _points(geometry):
    """Yield every (lon, lat) in a GeoJSON geometry."""
    def walk(c):
        if isinstance(c[0], (int, float)):
            yield c
        else:
            for x in c:
                yield from walk(x)
    yield from walk(geometry["coordinates"])


def validate(block_groups, facilities, recommendations):
    """Fail loudly if a file breaks the contract, so the app never breaks silently."""
    west, south, east, north = DETROIT_BOX
    geoids = set()
    for name, features in [("block_groups", block_groups["features"]), ("facilities", facilities["features"])]:
        for i, f in enumerate(features):
            for lon, lat in _points(f["geometry"]):
                if not (west <= lon <= east and south <= lat <= north):
                    raise ValueError(f"{name} feature {i} has a point outside Detroit: {lon}, {lat}")

    for name, rows, fields in [
        ("block_groups", [f["properties"] for f in block_groups["features"]], BLOCK_GROUP_FIELDS),
        ("facilities", [f["properties"] for f in facilities["features"]], FACILITY_FIELDS),
        ("recommendations", recommendations, RECOMMENDATION_FIELDS),
    ]:
        for i, row in enumerate(rows):
            missing = [k for k in fields if k not in row]
            if missing:
                raise ValueError(f"{name} row {i} is missing fields: {missing}")
        types = {r["sport"] for r in rows if "sport" in r}
        if not types <= set(FACILITY_TYPES):
            raise ValueError(f"{name} has unknown facility types: {types - set(FACILITY_TYPES)}")

    for p in (f["properties"] for f in block_groups["features"]):
        g = p["geoid"]
        if not (isinstance(g, str) and len(g) == 12 and g.isdigit()):
            raise ValueError(f"block group geoid must be a 12-digit string, got {g!r}")
        if g in geoids:
            raise ValueError(f"duplicate block group geoid {g}")
        geoids.add(g)
        s = p["access_score"]
        if s is not None and not (isinstance(s, int) and 0 <= s <= len(FACILITY_TYPES)):
            raise ValueError(f"block group {g} has access_score {s!r} outside 0 to {len(FACILITY_TYPES)}")

    for r in recommendations:
        if r["scenario"] not in SCENARIOS:
            raise ValueError(f"unknown scenario {r['scenario']!r}")
        unknown = [g for g in r["geoids"] if g not in geoids]
        if unknown:
            raise ValueError(f"recommendation {r['site_id']} serves unknown block groups: {unknown[:3]}")


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
# Access and finance model outputs
# --------------------------------------------------------------------------

def _num(v, as_int=False):
    """CSV and GeoJSON number -> int/float, blank -> None."""
    if v is None or v == "":
        return None
    v = float(v)
    return int(round(v)) if as_int else v


def _round_coords(c, nd=5):
    if isinstance(c[0], (int, float)):
        return [round(c[0], nd), round(c[1], nd)]
    return [_round_coords(x, nd) for x in c]


def _geom(geometry):
    return {"type": geometry["type"], "coordinates": _round_coords(geometry["coordinates"])}


def _read_csv(path):
    with open(path, newline="") as fh:
        return list(csv.DictReader(fh))


def _check_crs(collection, name):
    crs = (collection.get("crs") or {}).get("properties", {}).get("name", "")
    if crs and not crs.endswith(("CRS84", "4326")):
        raise ValueError(f"{name} is in {crs}; the app needs longitude/latitude (EPSG:4326)")


def build_from_model(folder, version, label):
    folder = Path(folder)
    bg_in = json.loads((folder / "block_groups_access.geojson").read_text())
    fac_in = json.loads((folder / "facilities_used.geojson").read_text())
    sites_in = json.loads((folder / "recommended_sites.geojson").read_text())
    for coll, name in [(bg_in, "block_groups_access"), (fac_in, "facilities_used"), (sites_in, "recommended_sites")]:
        _check_crs(coll, name)

    features = []
    for f in bg_in["features"]:
        p = f["properties"]
        out = {
            "geoid": str(p["GEOID"]),
            "neighborhood": None,  # not in the model outputs yet
            "council_district": None,
            "population": _num(p["population"], as_int=True),
            "youth_population": _num(p["youth"], as_int=True),
            "median_income": _num(p["median_income"], as_int=True),
            "pct_youth": _num(p["pct_youth"]),
            "pct_black": _num(p["pct_black"]),
            "pct_hispanic": _num(p["pct_hispanic"]),
            "access_score": _num(p["access_score"], as_int=True),
            "score_5min": _num(p["score_5min"], as_int=True),
            "score_15min": _num(p["score_15min"], as_int=True),
            "score_excl_school": _num(p["score_excl_school"], as_int=True),
            "profile": _num(p["cluster"], as_int=True),
        }
        for t in FACILITY_TYPES:
            m = _num(p[f"dist_{t}_m"])  # blank = no walking route
            out[f"walk_min_{t}"] = None if m is None else round(m / METERS_PER_MIN, 1)
        features.append({"type": "Feature", "geometry": _geom(f["geometry"]), "properties": out})

    facilities = []
    for f in fac_in["features"]:
        p = f["properties"]
        facilities.append({"type": "Feature", "geometry": _geom(f["geometry"]), "properties": {
            "facility_id": p["facility_id"],
            "sport": p["type"],
            "source": {"osm": "osm", "detection": "model"}.get(p["source"], p["source"]),
            "on_school_grounds": bool(p["on_school_grounds"]),
            "counts_for_access": bool(p["counts_for_access"]),
            "park_name": None,
            "confidence": _num(p.get("confidence")),
        }})

    # block_groups_served is only in the CSV; join it on scenario + rank.
    served = {(r["scenario"], int(r["rank"])): [g for g in r["block_groups_served"].split(";") if g]
              for r in _read_csv(folder / "recommended_sites.csv")}
    recommendations = []
    for f in sites_in["features"]:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        rank = int(p["rank"])
        recommendations.append({
            "scenario": p["scenario"],
            "rank": rank,
            "site_id": f"{p['scenario']}-{rank}",
            "park_id": p["park_id"],
            "park_name": p["park_name"],
            "geoids": served[(p["scenario"], rank)],
            "sport": p["type"],
            "cost_low": _num(p["capital_low"]),
            "cost_typical": _num(p["capital_typical"]),
            "cost_high": _num(p["capital_high"]),
            "maint_annual": _num(p["maint_annual"]),
            "cost_10yr": _num(p["tco10"]),
            "residents_served": _num(p["new_residents"], as_int=True),
            "youth_served": _num(p["new_youth"], as_int=True),
            "cost_per_resident": _num(p["cost_per_new_resident"]),
            "lon": round(lon, 5),
            "lat": round(lat, 5),
        })

    def table(name, int_cols=()):
        rows = _read_csv(folder / name)
        return [{k: (v if k in ("scenario", "type") else _num(v, as_int=k in int_cols)) for k, v in r.items()}
                for r in rows]

    summary = {
        "data_version": version,
        "label": label,
        "note": "Access and finance model results.",
        "facility_source": sorted({f["properties"]["source"] for f in facilities}),
        "acs_years": "2019-2023",
        "walk_threshold_m": WALK_THRESHOLD_M,
        "benchmark_spend_per_resident": BENCHMARK,
        "scenarios": table("scenario_summary.csv"),
        "gaps_by_type": table("gap_summary.csv"),
        "profiles": table("cluster_profiles.csv", int_cols=("cluster", "block_groups")),
        "cost_assumptions": table("cost_assumptions.csv"),
    }
    return ({"type": "FeatureCollection", "features": features},
            {"type": "FeatureCollection", "features": facilities}, recommendations, summary)


# --------------------------------------------------------------------------
# Computer vision detections (shown on the map, not yet in the access scores)
# --------------------------------------------------------------------------

DETECTION_FIELDS = ["detection_id", "facility_type", "confidence", "confidence_band", "lat", "lon",
                    "imagery_year", "model_version", "status", "in_city"]


def _bool(v):
    if isinstance(v, bool):
        return v
    if str(v).strip().lower() in ("true", "1"):
        return True
    if str(v).strip().lower() in ("false", "0"):
        return False
    raise ValueError(f"expected True/False, got {v!r}")


def build_detections(path):
    """Detections inside Detroit as contract facilities, plus counts for city_summary.json."""
    coll = json.loads(Path(path).read_text())
    _check_crs(coll, Path(path).name)
    rows = [f["properties"] for f in coll["features"]]
    for i, r in enumerate(rows):
        missing = [k for k in DETECTION_FIELDS if k not in r]
        if missing:
            raise ValueError(f"detection row {i} is missing fields: {missing}")
    ids = [r["detection_id"] for r in rows]
    if len(set(ids)) != len(ids):
        raise ValueError("detection_id values are not unique in this export")

    in_city = [r for r in rows if _bool(r["in_city"])]
    features = []
    for r in in_city:
        features.append({
            "type": "Feature",
            # The box center, which the detections file gives as lat/lon.
            "geometry": {"type": "Point", "coordinates": [round(float(r["lon"]), 5), round(float(r["lat"]), 5)]},
            "properties": {
                # Same id scheme as the access model's facilities_used. detection_id
                # can change between exports, so this id is only stable within one.
                "facility_id": f"det/{r['detection_id']}",
                "sport": r["facility_type"],
                "source": "model",
                "on_school_grounds": None,  # not checked for detections yet
                "counts_for_access": False,  # access model not rerun with detections
                "park_name": None,
                "confidence": round(float(r["confidence"]), 3),
                "confidence_band": r["confidence_band"],
                "status": r["status"],
                "imagery_year": int(r["imagery_year"]),
            },
        })

    def count(key):
        out = {}
        for f in features:
            k = f["properties"][key]
            out[k] = out.get(k, 0) + 1
        return dict(sorted(out.items()))

    summary = {
        "file": Path(path).name,
        "rows_in_file": len(rows),
        "rows_in_city": len(features),
        "rows_outside_city_dropped": len(rows) - len(features),
        "by_sport": count("sport"),
        "by_confidence_band": count("confidence_band"),
        "by_status": count("status"),
        "imagery_years": sorted({f["properties"]["imagery_year"] for f in features}),
        "model_versions": sorted({r["model_version"] for r in in_city}),
        "counts_for_access": False,
        "notes": [
            "One detection is one box: a row of six tennis courts is six detections.",
            "Confidence is a ranking score, not a probability. Band cutoffs are placeholders "
            "until the hand-tagged test set is scored.",
            "A detection means a facility is visible from above, not that the public can use it.",
        ],
    }
    return features, summary


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
        facilities.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [
                round(rng.uniform(west, east), 5), round(rng.uniform(south, north), 5)]},
            "properties": {
                "facility_id": f"syn-{i:04d}", "sport": rng.choice(FACILITY_TYPES),
                "source": rng.choice(["osm", "osm", "model", "both"]),
                "on_school_grounds": rng.random() < 0.15, "counts_for_access": True,
                "park_name": None, "confidence": None,
            },
        })

    features = []
    for r in range(rows):
        for c in range(cols):
            x0, y0 = west + c * dx, south + r * dy
            cx, cy = x0 + dx / 2, y0 + dy / 2
            props = {
                "geoid": f"9999999{r:02d}{c:03d}",
                "neighborhood": f"Synthetic area {chr(65 + r)}{c + 1}",
                "council_district": None,
                "population": rng.randint(600, 3000),
                "median_income": None, "pct_black": None, "pct_hispanic": None,
                "profile": None,
            }
            props["youth_population"] = int(props["population"] * rng.uniform(0.15, 0.35))
            props["pct_youth"] = round(props["youth_population"] / props["population"], 3)
            for t in FACILITY_TYPES:
                d = min(_meters(cx, cy, *f["geometry"]["coordinates"])
                        for f in facilities if f["properties"]["sport"] == t)
                props[f"walk_min_{t}"] = round(d / METERS_PER_MIN, 1)
            props["access_score"] = access_score(props)
            props["score_5min"] = props["score_15min"] = props["score_excl_school"] = None
            ring = [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy], [x0, y0]]
            ring = [[round(x, 5), round(y, 5)] for x, y in ring]
            features.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [ring]},
                             "properties": props})

    summary = {
        "data_version": "v0-synthetic",
        "label": "Demo data",
        "note": "Synthetic data for building the app. Not real Detroit results.",
        "acs_years": None, "walk_threshold_m": WALK_THRESHOLD_M,
        "benchmark_spend_per_resident": BENCHMARK,
        "scenarios": [], "gaps_by_type": [], "profiles": [], "cost_assumptions": [],
    }
    return ({"type": "FeatureCollection", "features": features},
            {"type": "FeatureCollection", "features": facilities}, [], summary)


# --------------------------------------------------------------------------
# v0 mock data from real sources (needs geopandas, osmnx, pygris and network)
# --------------------------------------------------------------------------

OSM_SPORT_MAP = {
    "tennis": "tennis_court", "basketball": "basketball_court",
    "soccer": "rectangular_field", "american_football": "rectangular_field",
    "baseball": "baseball_diamond", "softball": "baseball_diamond",
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
    for t in FACILITY_TYPES:
        sub = pitches[pitches["sport"] == t]
        if sub.empty:
            bgs[f"walk_min_{t}"] = None
            continue
        # Straight-line placeholder; the access model replaces this.
        bgs[f"walk_min_{t}"] = pts.apply(lambda p: sub.distance(p).min() / METERS_PER_MIN).round(1)

    bg_props = []
    for _, row in bgs.iterrows():
        p = {"geoid": row["GEOID"], "neighborhood": None, "council_district": None,
             "population": None, "youth_population": None, "median_income": None,
             "pct_youth": None, "pct_black": None, "pct_hispanic": None, "profile": None,
             "score_5min": None, "score_15min": None, "score_excl_school": None}
        for t in FACILITY_TYPES:
            v = row[f"walk_min_{t}"]
            p[f"walk_min_{t}"] = None if v is None else float(v)
        p["access_score"] = access_score(p)
        bg_props.append(p)

    bgs_out = gpd.GeoDataFrame(bg_props, geometry=bgs.geometry.simplify(15).values, crs=utm).to_crs(4326)
    fac = gpd.GeoDataFrame({
        "facility_id": [f"osm/{i}" for i in pitches["id"]],
        "sport": pitches["sport"], "source": "osm", "on_school_grounds": False,
        "counts_for_access": True, "park_name": pitches.get("name"), "confidence": None,
    }, geometry=pitches.geometry, crs=utm).to_crs(4326)

    summary = {
        "data_version": "v0-mock",
        "label": "Demo data",
        "note": "Real block groups and OSM facilities; walking times are straight-line placeholders.",
        "acs_years": None, "walk_threshold_m": WALK_THRESHOLD_M,
        "benchmark_spend_per_resident": BENCHMARK,
        "scenarios": [], "gaps_by_type": [], "profiles": [], "cost_assumptions": [],
    }
    return (json.loads(bgs_out.to_json(drop_id=True)), json.loads(fac.to_json(drop_id=True)), [], summary)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--from-model", metavar="DIR", help="access and finance model output folder")
    mode.add_argument("--synthetic", action="store_true")
    mode.add_argument("--mock", action="store_true")
    parser.add_argument("--version", default="v1", help="data version for --from-model (v1, v2, v3)")
    parser.add_argument("--label", default=None, help="badge text in the app header; omit for final data")
    parser.add_argument("--detections", metavar="FILE", default=None,
                        help="with --from-model: computer vision detections GeoJSON to add to the map")
    args = parser.parse_args()

    if args.from_model:
        label = args.label
        if label is None and args.version != "v3":
            label = "Preliminary: OSM facilities only" if args.version == "v1" else "Preliminary results"
        block_groups, facilities, recommendations, summary = build_from_model(args.from_model, args.version, label)
        if args.detections:
            det_features, det_summary = build_detections(args.detections)
            facilities["features"].extend(det_features)
            summary["facility_source"] = sorted({f["properties"]["source"] for f in facilities["features"]})
            summary["detections"] = det_summary
            summary["note"] = ("Access and finance model results. Access scores use the facilities marked "
                               "counts_for_access; computer vision detections are shown on the map but are "
                               "not in the scores yet.")
        write_all(block_groups, facilities, recommendations, summary)
    elif args.detections:
        parser.error("--detections needs --from-model")
    elif args.synthetic:
        write_all(*build_synthetic())
    else:
        write_all(*build_mock())


if __name__ == "__main__":
    main()
