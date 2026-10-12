const express = require('express');
const cors = require('cors');
const path = require('node:path');
const config = require('../config');

function createGatewayApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Sajikan static frontend dashboard
  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));

  // Health check gateway & downstream servers
  app.get('/api/health', async (req, res) => {
    let serverAStatus = 'DOWN';
    let serverBStatus = 'DOWN';

    try {
      const resA = await fetch(`${config.SERVER_A_URL}/api/health`);
      if (resA.ok) serverAStatus = 'UP';
    } catch (_) {}

    try {
      const resB = await fetch(`${config.SERVER_B_URL}/api/health`);
      if (resB.ok) serverBStatus = 'UP';
    } catch (_) {}

    res.json({
      status: 'UP',
      service: 'API Gateway & UTS Monitoring Dashboard',
      timestamp: new Date().toISOString(),
      ports: {
        gateway: config.PORT_GATEWAY,
        serverA: config.PORT_SERVER_A,
        serverB: config.PORT_SERVER_B
      },
      upstream: {
        serverA: serverAStatus,
        serverB: serverBStatus
      }
    });
  });

  // Proxy / Forwarding router untuk kemudahan pengujian dari satu interface
  // Forward to Server A
  app.get('/api/source/products', async (req, res) => {
    try {
      const upstream = await fetch(`${config.SERVER_A_URL}/api/source/products`);
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      res.status(502).json({ success: false, message: 'Server A tidak dapat dihubungi: ' + err.message });
    }
  });

  app.post('/api/source/seed', async (req, res) => {
    try {
      const upstream = await fetch(`${config.SERVER_A_URL}/api/source/seed`, { method: 'POST' });
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      res.status(502).json({ success: false, message: 'Server A tidak dapat dihubungi: ' + err.message });
    }
  });

  app.post('/api/transfers', async (req, res) => {
    try {
      const upstream = await fetch(`${config.SERVER_A_URL}/api/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {})
      });
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      res.status(502).json({ success: false, message: 'Server A tidak dapat dihubungi: ' + err.message });
    }
  });

  // Forward to Server B
  app.get('/api/receiver/transfers', async (req, res) => {
    try {
      const upstream = await fetch(`${config.SERVER_B_URL}/api/receiver/transfers`);
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      res.status(502).json({ success: false, message: 'Server B tidak dapat dihubungi: ' + err.message });
    }
  });

  app.get('/api/receiver/transfers/:id', async (req, res) => {
    try {
      const upstream = await fetch(`${config.SERVER_B_URL}/api/receiver/transfers/${req.params.id}`);
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      res.status(502).json({ success: false, message: 'Server B tidak dapat dihubungi: ' + err.message });
    }
  });

  app.post('/api/transfers/:id/decrypt', async (req, res) => {
    try {
      const upstream = await fetch(`${config.SERVER_B_URL}/api/transfers/${req.params.id}/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {})
      });
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      res.status(502).json({ success: false, message: 'Server B tidak dapat dihubungi: ' + err.message });
    }
  });

  app.get('/api/receiver/data', async (req, res) => {
    try {
      const upstream = await fetch(`${config.SERVER_B_URL}/api/receiver/data`);
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      res.status(502).json({ success: false, message: 'Server B tidak dapat dihubungi: ' + err.message });
    }
  });

  return app;
}

module.exports = {
  createGatewayApp
};
