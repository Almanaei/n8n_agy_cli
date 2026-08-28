const { spawn } = require('child_process');
const path = require('path');

const n8nBin = 'C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314\\node_modules\\n8n\\bin\\n8n';

console.log('[n8n Runner] Launching n8n from:', n8nBin);

const child = spawn(process.execPath, [n8nBin, 'start'], {
  env: process.env
});

child.stdout.on('data', (d) => {
  process.stdout.write(d.toString());
});

child.stderr.on('data', (d) => {
  process.stderr.write(d.toString());
});

child.on('error', (err) => {
  console.error('[n8n Runner] Error starting n8n:', err);
});

child.on('exit', (code, signal) => {
  console.log(`[n8n Runner] n8n exited with code ${code}, signal ${signal}`);
});
