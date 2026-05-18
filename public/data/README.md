# Static Data Layout

This folder is reserved for offline map assets and object data.

Recommended layout:

```text
public/data/
  map/
    Ground/maptex/{z}/{x}/{y}.webp
    Sky/maptex/{z}/{x}/{y}.webp
    Depths/maptex/{z}/{x}/{y}.webp
  objects/
    MainField/A-1.json
    MainField/A-2.json
    index.json
  details/
    {objectId}.json
```

The app currently uses a small TypeScript seed dataset in `src/data/sampleObjects.ts`.
After the crawler scripts are run, the next step is to load JSON from this folder
instead of that seed dataset.
