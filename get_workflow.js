const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const url = "http://localhost:5678/api/v1/workflows/VBjr7VIF75yUyP45";
const fs = require('fs');

async function run() {
  try {
    const res = await fetch(url, {
      headers: { "X-N8N-API-KEY": apiKey }
    });
    if (!res.ok) {
      console.error("Failed to fetch:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    fs.writeFileSync('workflow_VBjr7VIF75yUyP45.json', JSON.stringify(data, null, 2));
    console.log("Saved workflow to workflow_VBjr7VIF75yUyP45.json");
  } catch (err) {
    console.error(err);
  }
}
run();
