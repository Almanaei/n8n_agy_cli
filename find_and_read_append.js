const fs = require('fs');
const path = require('path');

function findFile(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const res = findFile(fullPath, filename);
      if (res) return res;
    } else if (file === filename) {
      return fullPath;
    }
  }
  return null;
}

const baseDir = "C:\\Users\\Almannai\\AppData\\Local\\npm-cache\\_npx\\a8a7eec953f1f314";
const found = findFile(baseDir, "append.operation.js");
console.log("Found path:", found);

if (found) {
  const content = fs.readFileSync(found, 'utf8');
  const lines = content.split('\n');
  // Print lines around 254 (or search for columns.schema)
  console.log("Searching for 'columns' in append.operation.js:");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('columns') || lines[i].includes('schema')) {
      console.log(`${i + 1}: ${lines[i].trim()}`);
    }
  }
}
