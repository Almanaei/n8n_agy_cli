const fs = require('fs');

const path = "C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314\\node_modules\\n8n-nodes-base\\nodes\\Google\\Sheet\\v2\\actions\\sheet\\append.operation.ts";

if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  const start = Math.max(0, 240);
  const end = Math.min(lines.length, 280);
  console.log(`Printing lines ${start} to ${end} of ${path}:`);
  for (let i = start; i < end; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log("File not found:", path);
}
