// scripts/health_monitor.js - Automated System Healthcheck & Uptime Monitor
const http = require('http');

const HEALTH_URL = 'http://localhost:3000/health';

function fetchHealthData() {
  return new Promise((resolve, reject) => {
    http.get(HEALTH_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: { error: "Invalid JSON response", raw: data } });
        }
      });
    }).on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });
  });
}

async function runHealthCheckOnce() {
  const res = await fetchHealthData();

  console.log("=================================================================");
  console.log("    BAHRAIN CIVIL DEFENSE AI PLATFORM - SYSTEM HEALTH AUDIT       ");
  console.log("=================================================================\n");

  if (res.status === 0) {
    console.error(`❌ CRITICAL: Server unreachable at ${HEALTH_URL}. Error: ${res.error}`);
    return false;
  }

  const h = res.body;
  const isHealthy = res.status === 200 && h.status === 'healthy';
  const overallEmoji = isHealthy ? '🟢 HEALTHY' : (h.status === 'degraded' ? '🟡 DEGRADED' : '🔴 UNHEALTHY');

  console.log(`  Overall System Status:  ${overallEmoji} (HTTP ${res.status})`);
  console.log(`  Server Uptime:          ${h.uptimeSeconds || 0} seconds`);
  console.log(`  Health Check Latency:   ${h.healthCheckLatencyMs || 0} ms`);
  console.log(`  Environment:            ${h.environment || 'production'}`);
  console.log(`  Node.js Version:        ${h.system?.nodeVersion || process.version}`);
  console.log(`  Memory (Heap / RSS):    ${h.system?.memory?.heapUsedMB || 0} MB / ${h.system?.memory?.rssMB || 0} MB`);
  console.log("-----------------------------------------------------------------");
  console.log("  Subsystem Status Breakdown:");
  
  if (h.services) {
    const s = h.services;
    const printService = (name, obj) => {
      const statusIcon = obj.status === 'operational' || obj.status === 'ready' ? '✅' : (obj.status === 'degraded' ? '⚠️' : 'ℹ️');
      const details = [];
      if (obj.latencyMs !== undefined) details.push(`${obj.latencyMs}ms`);
      if (obj.totalDocuments !== undefined) details.push(`${obj.totalDocuments} docs`);
      if (obj.totalArchives !== undefined) details.push(`${obj.totalArchives} backups`);
      if (obj.port !== undefined) details.push(`port ${obj.port}`);
      if (obj.error) details.push(`error: ${obj.error}`);
      console.log(`    ${statusIcon} ${name.padEnd(22)}: [${obj.status.toUpperCase()}] ${details.join(' | ')}`);
    };

    if (s.googleSheetsCrm) printService('Google Sheets CRM', s.googleSheetsCrm);
    if (s.elevenLabsVoiceAi) printService('ElevenLabs Voice AI', s.elevenLabsVoiceAi);
    if (s.n8nEngine) printService('n8n Workflow Engine', s.n8nEngine);
    if (s.uploadsStorage) printService('Uploads & File Storage', s.uploadsStorage);
    if (s.backupSubsystem) printService('Backup & Maintenance', s.backupSubsystem);
  }

  console.log("\n=================================================================");
  return isHealthy;
}

if (require.main === module) {
  const isWatch = process.argv.includes('--watch');
  if (isWatch) {
    console.log("Starting Continuous Health Monitor (Polling every 30s)... Press Ctrl+C to stop.\n");
    runHealthCheckOnce();
    setInterval(runHealthCheckOnce, 30000);
  } else {
    runHealthCheckOnce().then(ok => {
      process.exit(ok ? 0 : 1);
    });
  }
}

module.exports = { fetchHealthData, runHealthCheckOnce };
