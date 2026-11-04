# PlayMap data contract

The app, the internal dashboard, and both models share these four files. The
app only reads them, so swapping in new results is a file replacement, not a
code change. `data_pipeline/export_web_data.py` writes all four and refuses to
write anything if a field below is missing, a GEOID is malformed, or a point
falls outside Detroit.

Change a field name here first, then tell the app and dashboard owners.

## Rules

- Coordinates are longitude and latitude (EPSG:4326 / CRS84), rounded to 5
  decimals, even though analysis runs in a projected system.
- `geoid` is the 12-digit census block group ID, always a string (it can
  start with zero in other states, and Excel drops leading zeros).
- Missing values are `null`, never `0`, so a missing score is never shown as
  "no access".
- `sport` is one of the access model's four facility types: `tennis_court`,
  `basketball_court`, `rectangular_field` (soccer and football),
  `baseball_diamond`.
- Walking times are minutes. The model reports meters; the export converts at
  80.5 m per minute, so its 805 m threshold is the 10-minute walk.
- Every drop sets `data_version` in `city_summary.json`:
  `v0` mock (week 4), `v1` OSM-based results (week 6), `v2` interim detections
  (end of week 7), `v3` final (week 8). `label`, when set, is shown as a badge
  in the app header.

## `facilities.geojson` (points)

| Field | Type | Notes |
| --- | --- | --- |
| `facility_id` | string | Stable across versions |
| `sport` | string | See rules |
| `source` | string | `osm`, `model`, or `both` |
| `on_school_grounds` | boolean | Shown as a hollow dot in the app |
| `counts_for_access` | boolean | Whether the access model counted it |
| `park_name` | string or null | |
| `confidence` | number or null | Model detections only |

## `block_groups.geojson` (polygons)

| Field | Type | Notes |
| --- | --- | --- |
| `geoid` | string | 12-digit census block group ID |
| `neighborhood` | string or null | Detroit neighborhood name (not in model outputs yet) |
| `council_district` | string or null | (not in model outputs yet) |
| `population` | integer or null | ACS 2019-2023 |
| `youth_population` | integer or null | Under 18, ACS 2019-2023 |
| `median_income` | number or null | ACS 2019-2023 |
| `pct_youth`, `pct_black`, `pct_hispanic` | number or null | |
| `access_score` | integer 0 to 4 or null | Facility types within a 10-minute walk |
| `score_5min`, `score_15min` | integer or null | Same score at 5 and 15 minutes |
| `score_excl_school` | integer or null | Score without school-ground facilities |
| `walk_min_<sport>` | number or null | Walking minutes to the nearest facility, one field per sport |
| `profile` | string or null | Neighborhood cluster ID (names not defined yet) |

## `recommendations.json` (array, one row per recommended site per scenario)

| Field | Type | Notes |
| --- | --- | --- |
| `scenario` | string | `full_gap_closure`, `fixed_annual_budget`, or `youth_first` |
| `rank` | integer | Order within the scenario |
| `site_id` | string | `<scenario>-<rank>` |
| `park_id`, `park_name` | integer, string or null | Park the site is in |
| `geoids` | array of strings | Block groups newly brought within a 10-minute walk |
| `sport` | string | |
| `cost_low`, `cost_typical`, `cost_high` | number or null | Construction, USD |
| `maint_annual` | number or null | Yearly maintenance, USD |
| `cost_10yr` | number or null | Construction plus 10 years of maintenance |
| `residents_served`, `youth_served` | integer or null | Newly within a 10-minute walk |
| `cost_per_resident` | number or null | 10-year cost per new resident |
| `lon`, `lat` | number | Site location |

## `city_summary.json` (one object)

`data_version`, `label`, `note`, `facility_source`, `acs_years`,
`walk_threshold_m`, `benchmark_spend_per_resident` ($139 Detroit vs $154 among
the 100 largest cities, from the goals document's Trust for Public Land
citation), and the model's summary tables: `scenarios`, `gaps_by_type`,
`profiles`, and `cost_assumptions`.
