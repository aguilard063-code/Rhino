import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import cors from 'cors';
import { prisma } from '../src/lib/prisma';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

type TechLocation = { id: string; name?: string; lat: number; lng: number; status?: string; workOrderId?: string; updatedAt?: string };
let clients: Set<WebSocket> = new Set();
let currentLocations: Record<string, TechLocation> = {};

function broadcast(msg: any) {
  const text = JSON.stringify(msg);
  for (const c of clients) { if (c.readyState === WebSocket.OPEN) c.send(text); }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'bulk', payload: Object.values(currentLocations) }));
  ws.on('close', () => clients.delete(ws));
});

app.post('/api/locations', async (req, res) => {
  const payload = req.body as TechLocation;
  if (!payload?.id || typeof payload?.lat !== 'number' || typeof payload?.lng !== 'number') return res.status(400).send('missing fields');
  const now = new Date().toISOString();
  payload.updatedAt = now;
  currentLocations[payload.id] = payload;

  // Persist to DB (upsert)
  try {
    await prisma.technicianLocation.upsert({
      where: { id: payload.id },
      update: { lat: payload.lat, lng: payload.lng, workOrderId: payload.workOrderId ?? null, updatedAt: new Date() },
      create: { id: payload.id, technicianId: payload.id, lat: payload.lat, lng: payload.lng, workOrderId: payload.workOrderId ?? null },
    });
  } catch (err) {
    console.warn('Failed to persist location', err);
  }

  broadcast({ type: 'location', payload });
  return res.json({ ok: true });
});

const PORT = process.env.REALTIME_PORT ? Number(process.env.REALTIME_PORT) : 4000;
server.listen(PORT, () => console.log(`Realtime server listening on ${PORT}`));
