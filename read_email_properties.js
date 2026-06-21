const fs = require('fs');
const path = require('path');

const filepath = "C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314\\node_modules\\n8n-nodes-base\\dist\\nodes\\EmailSend\\v2\\EmailSendV2.node.js";

if (fs.existsSync(filepath)) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  console.log("Searching for parameter keys in EmailSendV2.node.js:");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fromEmail') || lines[i].includes('toEmail') || lines[i].includes('subject') || lines[i].includes('html')) {
      console.log(`${i + 1}: ${lines[i].trim()}`);
    }
  }
} else {
  console.log("File not found:", filepath);
}
