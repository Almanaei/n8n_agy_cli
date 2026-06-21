const fs = require('fs');
const path = require('path');

const baseDir = "C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314\\node_modules\\n8n-nodes-base\\dist\\nodes";

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (f.toLowerCase().includes('email') && f.endsWith('.node.js')) {
      console.log("Found email node file:", full);
    }
  }
}

if (fs.existsSync(baseDir)) {
  scanDir(baseDir);
} else {
  console.log("Base dir does not exist:", baseDir);
}
