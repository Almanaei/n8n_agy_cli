const fs = require('fs');
const path = require('path');

const targetDir = "C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314\\node_modules\\n8n-nodes-base\\dist\\nodes\\EmailSend";

function scan(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scan(full);
    } else if (f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('fromEmail') || content.includes('toEmail')) {
        console.log(`Found match in file: ${full}`);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('fromEmail') || lines[i].includes('toEmail') || lines[i].includes('subject') || lines[i].includes('html')) {
            console.log(`${i + 1}: ${lines[i].trim()}`);
          }
        }
      }
    }
  }
}

if (fs.existsSync(targetDir)) {
  scan(targetDir);
} else {
  console.log("Target dir does not exist:", targetDir);
}
