const fs = require('fs');

const filepath = "C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314\\node_modules\\n8n-nodes-base\\dist\\nodes\\Google\\Sheet\\v2\\actions\\sheet\\read.operation.js";

if (fs.existsSync(filepath)) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  console.log("Printing lines 25 to 65 of read.operation.js:");
  for (let i = 24; i < 65 && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log("File not found:", filepath);
}
