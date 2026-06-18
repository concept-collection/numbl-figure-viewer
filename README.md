# numbl figure viewer

A small browser app that opens a `.h5` **figure file** exported from
[numbl](https://numbl.org) and renders it — reusing numbl's own figure
components via the `numbl/graphics` package export.

In numbl (or its IDE / plot viewer) you can download any figure's data as a
self-describing HDF5 file (numeric data as gzip-compressed datasets, styling as
attributes). Drop that file here to view it again outside numbl.

## How it works

```ts
import { importFigureHdf5, FigureView } from "numbl/graphics";

const figure = await importFigureHdf5(bytes); // .h5 → FigureState
// <FigureView figure={figure} />
```

`importFigureHdf5` parses the HDF5 file (via lazily-loaded h5wasm) into the same
`FigureState` numbl renders internally, and `FigureView` draws it.

## Develop

```bash
npm install      # numbl is a local file: dependency (../../numbl)
npm run dev
```

> This app consumes `numbl` as `file:../../numbl`. Build the numbl graphics
> bundle first (`npm run build:graphics` in the numbl repo) so
> `numbl/graphics` resolves.

## Build

```bash
npm run build            # → dist/
npm run build:pages      # base path for GitHub Pages project site
```
