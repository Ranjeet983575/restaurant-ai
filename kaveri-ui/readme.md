Kaveri UI

This folder contains a minimal Vite + React + TypeScript frontend for Kaveri.

Quick start:

1. cd kaveri-ui
2. npm install
3. npm run dev

The frontend expects an API base URL in `.env` as `VITE_API_URL` (defaults to http://localhost:3000).

Features implemented:
- Chat interface with messages
- Prefix search panel that POSTs to `/search`
- Chat messages POSTed to `/chat`

You can customize prefixes in `src/components/Chat.tsx`.
5 