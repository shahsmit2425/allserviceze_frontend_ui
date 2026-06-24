# ServiceTones Frontend UI Export

This folder is a frontend-only export of the current ServiceTones UI so you can move it into another repository and connect that repository to Vercel.

Included in this export:

- `src/` with all current pages, components, contexts, hooks, and styling
- `public/` assets used by the frontend
- `package.json` and `package-lock.json`
- `vite.config.js`, `tailwind.config.js`, `postcss.config.js`
- `index.html`, `jsconfig.json`, `tsconfig.json`, `components.json`
- `vercel.json` for SPA routing on Vercel
- `.env.example` for the frontend environment variables

Not included:

- `node_modules/`
- `dist/`
- `.env.local`

## How To Use In Another Repo

If the other repository is only for this frontend, put the contents of this folder at the repo root.

If you keep this folder nested inside another repo, set the Vercel Root Directory to this folder.

## Recommended Vercel Settings

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

## Setup

1. Copy `.env.example` to `.env.local` for local development.
2. Or add the same environment variables in Vercel Project Settings.
3. Install dependencies:

```bash
npm install
```

4. Start locally:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Notes

- This frontend expects a backend API configured through `VITE_BACKEND_URL` or `VITE_API_URL`.
- Client-side routing is handled by `vercel.json` so direct links to frontend pages work on Vercel.
- This export is based on the current working frontend UI from the main project.

## Main Files You Will Need

- `src/pages/` for all page layouts
- `src/components/` for shared UI components
- `src/context/` for auth, chat, and notifications
- `src/hooks/` for shared frontend logic
- `public/` for public assets
- `.env.example` for environment variable setup
