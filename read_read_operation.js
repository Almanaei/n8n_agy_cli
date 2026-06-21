const fs = require('fs');
const path = require('path');

const filepath = "C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314\\node_modules\\n8n-nodes-base\\dist\\nodes\\Google\\Sheet\\v2\\actions\\sheet\\read.operation.js";

if (fs.existsSync(filepath)) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  console.log("Searching for filters/conditions in read.operation.js:");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('filter') || lines[i].includes('condition') || lines[i].includes('limit')) {
      console.log(`${i + 1}: ${lines[i].trim()}`);
    }
  }
} else {
  console.log("File not found:", filepath);
}
