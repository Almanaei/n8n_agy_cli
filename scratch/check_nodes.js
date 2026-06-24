const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const workflowId = "VBjr7VIF75yUyP45";
const url = `http://localhost:5678/api/v1/workflows/${workflowId}`;

async function run() {
  const res = await fetch(url, {
    headers: { "X-N8N-API-KEY": apiKey }
  });
  if (!res.ok) {
    console.error("Failed to fetch workflow:", res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log("Workflow name:", data.name);
  console.log("Nodes:");
  data.nodes.forEach(n => {
    console.log(`- [${n.type}] "${n.name}" (ID: ${n.id})`);
  });
}
run();
