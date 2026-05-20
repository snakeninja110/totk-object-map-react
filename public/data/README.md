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
  objects/
    raw/
      MainAndMinusField/_all/{query}.json
      manifest.json
    MainField/A-1.json
    MainField/A-2.json
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

The app reads local object markers from:

```text
public/data/objects/index.json
```

The sidebar can switch object data between local JSON and the remote radar API.
Remote API mode requires a search query and does not affect the tile source
switch.

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
