// src/routes/health_controller.js - Health Check & Subsystem Diagnostic Controller
const fs = require('fs');
const path = require('path');
const { getCachedGoogleAccessToken } = require('../services/google_sheets_client');
const { uploadsDir } = require('../utils/file_utils');
const { SPREADSHEET_ID } = require('../services/applications_repository');

async function handleHealthCheck(req, res, { apiKey, agentId, clientEmail, privateKey }) {
  const healthStartTime = Date.now();
  let overallHealthy = true;
  const services = {};

  // 1. Check Google Sheets API
  try {
    const t0 = Date.now();
    const accessToken = await getCachedGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets.readonly"]);
    const testRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=spreadsheetId,properties.title`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const latency = Date.now() - t0;
    if (testRes.ok) {
      const info = await testRes.json();
      services.googleSheets = { status: "operational", latencyMs: latency, title: info.properties?.title };
    } else {
      services.googleSheets = { status: "degraded", latencyMs: latency, httpCode: testRes.status };
      overallHealthy = false;
    }
  } catch (e) {
    services.googleSheets = { status: "unhealthy", error: e.message };
    overallHealthy = false;
  }

  // 2. Check ElevenLabs API
  try {
    const t0 = Date.now();
    const elRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: { "xi-api-key": apiKey }
    });
    const latency = Date.now() - t0;
    if (elRes.ok) {
      services.elevenLabs = { status: "operational", latencyMs: latency, agentId };
    } else {
      services.elevenLabs = { status: "degraded", latencyMs: latency, httpCode: elRes.status };
      overallHealthy = false;
    }
  } catch (e) {
    services.elevenLabs = { status: "unhealthy", error: e.message };
    overallHealthy = false;
  }

  // 3. Check File Storage (Uploads)
  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      services.uploadsStorage = {
        status: "operational",
        totalDocuments: files.length,
        storagePath: uploadsDir,
        writable: true
      };
    } else {
      services.uploadsStorage = { status: "operational", totalDocuments: 0 };
    }
  } catch (e) {
    services.uploadsStorage = { status: "unhealthy", error: e.message };
    overallHealthy = false;
  }

  const memUsage = process.memoryUsage();
  const payload = {
    status: overallHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    healthCheckLatencyMs: Date.now() - healthStartTime,
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    services,
    system: {
      memory: {
        heapUsedMB: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100
      },
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  res.writeHead(overallHealthy ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = {
  handleHealthCheck
};
