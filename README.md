# Rhino Field Ops — feature/full-implementation

This branch adds the full implementation scaffolding for:

- Prisma schema, migrations and seed
- NextAuth credentials integration (register + login)
- Offline-first PWA support (IndexedDB, offline save, sync, service worker)
- ServiceForm UI and offline indicator
- Dispatcher live map (Leaflet) + realtime server (WebSocket)
- Reports: Excel (exceljs) and PDF (pdfkit) export endpoints
- Upload presign endpoint skeleton

Important environment variables (do not store secrets in the repo):

- DATABASE_URL (Postgres connection string)
- NEXTAUTH_SECRET
- NEXT_PUBLIC_REALTIME_SERVER (optional — default http://localhost:4000)
- If using S3: S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY

Quick start (local):

1. Install dependencies

```bash
npm install
npm install -D prisma
npm install @prisma/client exceljs pdfkit idb leaflet react-leaflet ws
```

2. Generate Prisma client and run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

3. Seed the database

```bash
npx ts-node prisma/seed.ts
```

4. Start the realtime server (in a separate terminal)

```bash
node server/realtime-server.ts
```

5. Start Next.js

```bash
npm run dev
```

Notes
- After pushing to remote, set your environment variables in your deployment environment.
- The presign upload endpoint is a placeholder — wire to S3/GCS in production.
- For production WebSocket scaling use Redis or a managed pub/sub.
