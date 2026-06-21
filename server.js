const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

process.on('uncaughtException', (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.stack || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
});


const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";

const server = http.createServer(async (req, res) => {
  if (req.url === '/get-signed-url') {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey
        }
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs API returned ${response.status}: ${errText}`);
      }
      
      const data = await response.json();
      res.writeHead(200, { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      });
      res.end(JSON.stringify(data));
    } catch (error) {
      console.error("Error fetching signed URL:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else if (req.url === '/standalone' || req.url === '/standalone.html' || req.url === '/index_standalone.html') {
    fs.readFile(path.join(__dirname, 'index_standalone.html'), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index_standalone.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Set up WebSocket server for proxying
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  if (pathname === '/stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      // Connect to the Python FastAPI backend on port 8000
      const targetWs = new WebSocket('ws://localhost:8000/stream');

      ws.on('message', (message, isBinary) => {
        if (targetWs.readyState === WebSocket.OPEN) {
          if (isBinary) {
            targetWs.send(message);
          } else {
            targetWs.send(message.toString('utf8'));
          }
        }
      });

      targetWs.on('message', (data, isBinary) => {
        if (ws.readyState === WebSocket.OPEN) {
          if (isBinary) {
            ws.send(data);
          } else {
            ws.send(data.toString('utf8'));
          }
        }
      });

      ws.on('close', () => {
        try {
          if (targetWs.readyState === WebSocket.OPEN || targetWs.readyState === WebSocket.CONNECTING) {
            targetWs.close();
          }
        } catch (e) {
          console.error("Error closing target WS:", e);
        }
      });
      targetWs.on('close', () => {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch (e) {
          console.error("Error closing client WS:", e);
        }
      });
      
      ws.on('error', (err) => console.error("Client WS proxy error:", err));
      targetWs.on('error', (err) => console.error("Target WS proxy error:", err));
    });
  } else {
    socket.destroy();
  }
});

server.listen(3000, () => {
  console.log('Test server running at http://localhost:3000');
});
