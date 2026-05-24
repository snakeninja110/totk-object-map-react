# Static Data Layout

This folder is reserved for offline map assets and object data.

Map tiles under `public/data/map/` are generated local cache files and are not
committed to Git. Rebuild them locally with `npm run fetch:tiles`.

Recommended layout:

```text
public/data/
  map/
    Ground/maptex/{z}/{x}/{y}.webp
    Sky/maptex/{z}/{x}/{y}.webp
    Depths/maptex/{z}/{x}/{y}.webp
  map-areas/
    MapTower.json
    Ground.json
    MinusField.json
    Cave.json
    Sky.json
    sky_polys.json
    cave_polys.json
    cave_polys_detail.json
    cherry_blossom_trees.json
  objects/
    raw/
      MainAndMinusField/_all/{query}.json
      manifest.json
    static/
      mainfield-static.json
      location-marker-names.json
      dungeon-names.json
    index.json
  details/
    {objectId}.json
```

Run a small tile fetch before attempting the full offline cache:

```bash
npm run fetch:tiles -- --layers=Ground --zooms=0..1 --delay-ms=200
```

Fetch the full local tile cache:

```bash
npm run fetch:tiles
```

Verify downloaded tiles:

```bash
npm run verify:tiles
```

The app can switch between local cached tiles and remote zeldamods tiles from the
sidebar. Missing local tiles do not automatically fall back to remote tiles.

Visible map areas are stored in:

```text
public/data/map-areas/
```

These files are copied from the source site's `game_files/ecosystem` data and
are used by the sidebar's `Visible map areas` controls. The frontend normalizes
FeatureCollection, Feature arrays, and grouped MapTower data into Polygon /
MultiPolygon overlays.

The app reads local object markers from:

```text
public/data/objects/index.json
```

`objects/index.json` is generated from two sources:

- `objects/raw`: radar API cache for local search and non-static object results.
- `objects/static`: zeldamods static map marker files used to match the source
  site's Filter panel.

The sidebar can switch object data between local JSON and remote data. This
switch is independent from the tile source switch.

Remote object mode has two paths:

- Without a search query, the app loads the source site's static marker summary
  once and filters categories locally.
- With a search query, the app calls the radar API for search results.

Fetch raw radar API object results:

```bash
npm run fetch:map-unit -- --preset=core --limit=5000 --delay-ms=250
```

Use `--queries=TBox,Enemy` for a targeted fetch, `--preset=all` for all bundled
query presets, `--limit=-1` for complete results, and `--force` to refresh files
that already exist. The API does not currently provide working offset/page
pagination, so the crawler splits work by query and records the result in
`objects/raw/manifest.json`.

Build the frontend object index from raw radar responses:

```bash
npm run build:objects
```

Verify the generated object index:

```bash
npm run verify:objects
```

Current index notes:

- Static marker categories are used for the main Filter panel.
- `Chasm` follows the source site behavior: most chasms render on both Surface
  and Depths, while `Hyrule Castle Chasm` only renders on Depths.
- `Cave/Well` is one category, but each marker keeps the source `Icon` value so
  cave entrances and wells use different icons.
