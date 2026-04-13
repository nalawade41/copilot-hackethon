# web

React + Vite + Cornerstone3D front-end for the Copilot DICOM viewer. Runs entirely in the browser for "Browser only" mode; delegates to the .NET backend for "Server based" mode.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
```

Drop a `.dcm` file or a folder of slices onto the page.

## Test

```bash
npm test             # one-shot
npm run test:watch   # watch mode
```

## Build

```bash
npm run build        # type-check + Vite prod build → dist/
npm run preview      # preview prod bundle locally
```

## Configuration

Backend URL comes from `.env` (loaded by Vite):

```
VITE_SERVER_URL=http://localhost:5050
```

A `.env.demo` is provided as a template for deployment — load it with `npm run build -- --mode demo` or `npm run dev -- --mode demo`.

## Sample data

Lives in `../samples/` at the repo root (shared with the backend and any future clients). The `.env` / path resolution expects the monorepo layout, so don't move `web/` outside of the repo.

## Structure

See [docs/superpowers/plans/](../docs/superpowers/plans/) for the architectural overview.

```
web/
├── src/
│   ├── App.tsx                # providers + Layout
│   ├── main.tsx               # initCornerstone + mount
│   ├── components/<Name>/     # pure JSX + co-located hooks/types
│   ├── pages/<Name>/          # pages own their data hooks
│   ├── context/               # ModeContext, StudyContext, MetadataPanelContext
│   ├── lib/common/            # runtime init (cornerstone-init)
│   ├── lib/utility/           # pure helpers (metadata, file-source, download)
│   ├── service/               # backend API calls (dicom-api.service)
│   ├── constants/             # centralized constants
│   └── types/                 # shared types
└── tests/                     # vitest + RTL
```
