# PlayMap data contract

The app, the internal dashboard, and both models share these four files. The
app only reads them, so swapping mock data for real results is a file
replacement, not a code change. `data_pipeline/export_web_data.py` writes all
four and refuses to write a file that is missing a field below.

Change a field name here first, then tell the app and dashboard owners.

## Rules

- Coordinates are longitude and latitude (EPSG:4326), even though analysis runs
  in a projected system.
- Missing values are `null`, never `0`, so a missing score is never shown as
  "no access".
- `sport` is one of `tennis`, `basketball`, `soccer`, `baseball_softball`,
  `football`.
- Every drop sets `data_version` in `city_summary.json`:
  `v0` mock (week 4), `v1` OSM-based results (week 6), `v2` interim detections
  (end of week 7), `v3` final (week 8).

## `facilities.geojson` (points, written from the detection model's inventory)

| Field | Type | Notes |
| --- | --- | --- |
| `facility_id` | string | Stable across versions |
| `sport` | string | See rules |
| `source` | string | `osm`, `model`, or `both` |
| `is_public` | boolean | From parcel ownership; private facilities do not count toward access |
| `park_name` | string or null | |
| `confidence` | number or null | Model detections only |

## `block_groups.geojson` (polygons, written from the access and finance model)

| Field | Type | Notes |
| --- | --- | --- |
| `geoid` | string | 12-digit census block group ID |
| `neighborhood` | string or null | Detroit neighborhood name |
| `council_district` | string or null | |
| `population` | integer or null | ACS 5-year |
| `youth_population` | integer or null | Under 18, ACS 5-year |
| `median_income` | number or null | ACS 5-year |
| `access_score` | integer 0 to 5 or null | Facility types within a 10-minute walk |
| `walk_min_<sport>` | number or null | Walking minutes to the nearest public facility, one field per sport |
| `profile` | string or null | Neighborhood cluster label |

Race fields: to be added once the team picks them.

## `recommendations.json` (array, one row per recommended site per scenario)

| Field | Type | Notes |
| --- | --- | --- |
| `scenario` | string | `full_gap_closure`, `fixed_annual_budget`, or `youth_first` |
| `rank` | integer | 1 = best value in that scenario |
| `site_id` | string | |
| `geoid` | string | Block group the site sits in |
| `sport` | string | |
| `cost_low`, `cost_typical`, `cost_high` | number or null | Construction, USD, from cited sources only |
| `cost_10yr` | number or null | Construction plus 10 years of maintenance |
| `residents_served`, `youth_served` | integer or null | Newly within a 10-minute walk |
| `cost_per_resident` | number or null | |

## `city_summary.json` (one object)

`data_version`, `note`, `naip_year`, `acs_years`, `benchmark_spend_per_resident`
($139 Detroit vs $154 among the 100 largest cities, from the goals document's
Trust for Public Land citation), and `scenarios` (citywide totals per scenario).
