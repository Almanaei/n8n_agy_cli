const { spawn, exec } = require('child_process');

console.log('=====================================================');
console.log('Starting All Voice AI & n8n Integration Servers...');
console.log('Press Ctrl+C to stop all servers.');
console.log('=====================================================\n');

const children = [];

function logOutput(name, stream, colorCode) {
  if (!stream) return;
  stream.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`\x1b[${colorCode}m[${name}]\x1b[0m ${line.trim()}`);
      }
    }
  });
}

function startProcess(name, command, args, colorCode) {
  console.log(`[System] Starting ${name} (${command} ${args.join(' ')})...`);
  const child = spawn(command, args, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  logOutput(name, child.stdout, colorCode);
  logOutput(name + ' Err', child.stderr, colorCode);

  child.on('error', (err) => {
    console.error(`\x1b[31m[System] Error in ${name}: ${err.message}\x1b[0m`);
  });

  child.on('exit', (code, signal) => {
    console.log(`\x1b[33m[System] ${name} exited with code ${code} (signal: ${signal})\x1b[0m`);
  });

  children.push({ name, process: child });
}

// 1. Start n8n Server (Green - 32)
startProcess('n8n', 'npx', ['n8n', 'start'], '32');

// 2. Start Express Web Server (Blue - 34)
startProcess('Express Server', 'node', ['server.js'], '34');

// 3. Start Cloudflare Tunnel Manager (Cyan - 36)
startProcess('Tunnel Manager', 'node', ['cloudflared_manager.js'], '36');

// 4. Start Standalone Voice AI (Magenta - 35)
startProcess('Python Voice Agent', 'C:\\Python313\\python.exe', ['-m', 'uvicorn', 'standalone.main:app', '--host', '0.0.0.0', '--port', '8000'], '35');

// Handle clean shutdown of all processes
let isCleaningUp = false;
function cleanUp() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n[System] Stopping all servers...');

  let killCount = 0;
  children.forEach(({ name, process: child }) => {
    if (child.pid) {
      console.log(`[System] Terminating ${name} (PID ${child.pid})...`);
      if (process.platform === 'win32') {
        // Kill process and all its children recursively
        exec(`taskkill /F /T /PID ${child.pid}`, () => {
          killCount++;
          if (killCount === children.length) {
            console.log('[System] All servers stopped. Exiting.');
            process.exit(0);
          }
        });
      } else {
        try {
          process.kill(-child.pid); // Negative PID kills the process group
        } catch (e) {}
        killCount++;
      }
    } else {
      killCount++;
    }
  });

  if (process.platform !== 'win32' || killCount === children.length) {
    console.log('[System] All servers stopped. Exiting.');
    process.exit(0);
  }
  
  // Safety timeout in case taskkill hangs
  setTimeout(() => {
    console.log('[System] Force exiting.');
    process.exit(0);
  }, 3000);
}

// Intercept exit signals
process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
