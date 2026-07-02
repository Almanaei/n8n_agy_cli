const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const baseUrl = "http://localhost:5678/api/v1/workflows";

async function run() {
  console.log("Deactivating mwNnYOQ8OB6jMF9C (n8n-standalone-v2)...");
  try {
    const res = await fetch(`${baseUrl}/mwNnYOQ8OB6jMF9C/deactivate`, {
      method: "POST",
      headers: { "X-N8N-API-KEY": apiKey }
    });
    console.log(`Deactivate status: ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error("Failed to deactivate mwNnYOQ8OB6jMF9C:", e);
  }

  console.log("Activating VBjr7VIF75yUyP45 (ElevenLabs Lead Integration)...");
  try {
    const res = await fetch(`${baseUrl}/VBjr7VIF75yUyP45/activate`, {
      method: "POST",
      headers: { "X-N8N-API-KEY": apiKey }
    });
    console.log(`Activate status: ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error("Failed to activate VBjr7VIF75yUyP45:", e);
  }
}

run();
