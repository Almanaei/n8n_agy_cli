const { spawn, exec } = require('child_process');
const path = require('path');

console.log('=====================================================');
console.log('Running Self-Contained Voice AI & n8n Test Scenario...');
console.log('=====================================================\n');

const children = [];
let isCleaningUp = false;

function cleanUp(exitCode = 0) {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\n[System] Stopping all servers...');

  let killCount = 0;
  if (children.length === 0) {
    process.exit(exitCode);
  }

  children.forEach(({ name, process: child }) => {
    if (child.pid) {
      console.log(`[System] Terminating ${name} (PID ${child.pid})...`);
      if (process.platform === 'win32') {
        exec(`taskkill /F /T /PID ${child.pid}`, () => {
          killCount++;
          if (killCount === children.length) {
            console.log('[System] All servers stopped. Exiting.');
            process.exit(exitCode);
          }
        });
      } else {
        try {
          process.kill(-child.pid);
        } catch (e) {}
        killCount++;
      }
    } else {
      killCount++;
    }
  });

  if (process.platform !== 'win32' || killCount === children.length) {
    console.log('[System] All servers stopped. Exiting.');
    process.exit(exitCode);
  }

  setTimeout(() => {
    console.log('[System] Force exiting.');
    process.exit(exitCode);
  }, 4000);
}

process.on('SIGINT', () => cleanUp(1));
process.on('SIGTERM', () => cleanUp(1));

function logOutput(name, stream, colorCode) {
  if (!stream) return null;
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
    if (!isCleaningUp) {
      console.log(`\x1b[33m[System] ${name} exited with code ${code} (signal: ${signal})\x1b[0m`);
    }
  });

  children.push({ name, process: child });
  return child;
}

// 1. Start n8n Server (Green - 32)
startProcess('n8n', 'npx', ['n8n', 'start'], '32');

// 2. Start Express Web Server (Blue - 34)
startProcess('Express Server', 'node', ['server.js'], '34');

// 3. Start Standalone Voice Agent (Magenta - 35)
startProcess('Python Voice Agent', 'C:\\Python313\\python.exe', ['-m', 'uvicorn', 'standalone.main:app', '--host', '0.0.0.0', '--port', '8000'], '35');

// 4. Start Cloudflare Tunnel Manager (Cyan - 36)
const tunnelManager = startProcess('Tunnel Manager', 'node', ['cloudflared_manager.js'], '36');

// Monitor Tunnel Manager output to wait until agent is patched
let isTunnelReady = false;
tunnelManager.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Agent successfully patched!')) {
    console.log('\n\x1b[32m[System] cloudflared tunnel is online and ElevenLabs is patched! Launching simulator...\x1b[0m\n');
    isTunnelReady = true;
    
    // Start simulation scenario
    const simulator = spawn('node', ['test_real_scenario.js'], {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    logOutput('Simulator', simulator.stdout, '33');
    logOutput('Simulator Err', simulator.stderr, '31');

    simulator.on('exit', (code) => {
      console.log(`\n\x1b[32m[System] Simulator finished with exit code ${code}. Waiting 10 seconds for post-call workflow to complete...\x1b[0m`);
      
      setTimeout(() => {
        console.log('\n[System] Test execution complete. Initiating clean shutdown...');
        cleanUp(code);
      }, 10000);
    });
  }
});
