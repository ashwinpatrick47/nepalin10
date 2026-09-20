require('dotenv').config();

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const TRACKER_SECRET = process.env.TRACKER_SECRET;
const MAX_TRAIL_POINTS = 2000;

// In-memory state: latest position + running trail.
// Resets whenever the server restarts (no database, by design for this tracker).
let latest = null;
const trail = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// The tracker's root sends visitors to the main website; the website's
// "Track me" link is what leads to /map.html.
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
app.get('/', (req, res) => {
  res.redirect(SITE_URL);
});

app.get('/api/config', (req, res) => {
  res.json({ mapboxToken: process.env.MAPBOX_TOKEN || '' });
});

app.get('/api/location', (req, res) => {
  res.json({ latest, trail });
});

function addPoint(point) {
  latest = point;
  trail.push(point);
  if (trail.length > MAX_TRAIL_POINTS) {
    trail.splice(0, trail.length - MAX_TRAIL_POINTS);
  }
  io.emit('location', { latest, point });
}

app.post('/api/location', (req, res) => {
  const { lat, lng, accuracy, speed, secret } = req.body || {};

  if (TRACKER_SECRET && secret !== TRACKER_SECRET) {
    return res.status(401).json({ error: 'invalid secret' });
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }

  addPoint({
    lat,
    lng,
    accuracy: typeof accuracy === 'number' ? accuracy : null,
    speed: typeof speed === 'number' ? speed : null,
    timestamp: Date.now(),
  });

  res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`live-run-tracker listening on port ${PORT}`);
  // Optional: mirror a Garmin LiveTrack session onto the map (see garmin.js).
  if (process.env.GARMIN_LIVETRACK_URL) {
    require('./garmin').start(process.env.GARMIN_LIVETRACK_URL, addPoint);
  }
});
