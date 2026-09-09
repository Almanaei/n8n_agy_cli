# ElevenLabs Integration Rules & Guidelines

This document outlines key rules, constraints, and solutions for maintaining the ElevenLabs Conversational Voice Agent integration in this workspace.

## 1. Webhook URL Immutability
* **Constraint**: ElevenLabs webhook URLs are **immutable** once created. Any attempt to modify a webhook's `webhook_url` using `PATCH /v1/workspace/webhooks/{webhook_id}` will be silently ignored by the ElevenLabs API, leaving the webhook pointing to the old URL.
* **Solution**: When the local tunnel URL changes (e.g. on tunnel restart):
  1. Call `GET /v1/workspace/webhooks` to see if a webhook for the new URL already exists.
  2. If it does not exist, create a new webhook using `POST /v1/workspace/webhooks`.
  3. Associate the new webhook ID with the agent configuration (`workspace_overrides`) and workspace settings.
  4. Only then, delete the old, unused webhooks.

## 2. Webhook Deletion Dependency
* **Constraint**: ElevenLabs blocks the deletion of a webhook (returning `405 webhook_in_use`) if it is still referenced anywhere.
* **References**: A webhook can be referenced in two places:
  - Global Workspace settings: `webhooks.post_call_webhook_id` (via `PATCH /v1/convai/settings`).
  - Agent-specific settings: `platform_settings.workspace_overrides.webhooks.post_call_webhook_id` (via `PATCH /v1/convai/agents/{agent_id}`).
* **Solution**: You must update/patch **both** of these configurations to reference the new webhook ID *before* calling `DELETE /v1/workspace/webhooks/{old_webhook_id}`.

## 3. Dynamic Tool Management
* **Constraint**: Do not hardcode ElevenLabs workspace tool IDs (e.g. `save_lead_info` tool ID) or assume they are static. Doing so causes agent updates to fail validation if tool IDs change or get deleted.
* **Solution**: 
  - Always query workspace tools dynamically via `GET /v1/convai/tools` to find the ID for the `save_lead_info` tool.
  - Bind the agent prompt to the resolved active tool ID using `conversation_config.agent.prompt.tool_ids` in your agent PATCH payload.

## 4. Local Tunnel Execution
* **Practice**: Always use `cloudflared_manager.js` to manage the Cloudflare tunnel instead of running raw `cloudflared` commands. The manager script automatically:
  - Spawns the tunnel and captures the new URL.
  - Dynamically registers and configures webhooks/tools in ElevenLabs.
  - Cleans up stale webhooks to prevent security/delivery issues.

## 6. Safe Background Process & Server Management
* **Constraint**: **NEVER** run `powershell -ExecutionPolicy Bypass -File .\stop_servers.ps1` or blanket `Stop-Process` commands matching shell applications (`powershell`, `cmd`, `%n8n%`). Doing so closes user terminal windows on their PC.
* **Solution**: 
  - To stop background tasks, use `manage_task` with `Action: 'kill'` on the specific running task ID.
## 7. Mandatory Service Application Tool Invocation Guard (Button Rendering Only - No Auto-Modal)
* **Constraint**: The ElevenLabs AI agent MUST NEVER claim the form modal is open automatically. When the user requests to apply for a service, the agent MUST call `trigger_service_application` to render the **"Apply Now / قدّم الآن" button** on screen below the chat turn. The form modal MUST ONLY open when the user manually clicks the "Apply Now" button on screen.
* **Solution**:
  - `trigger_service_application` in `index.html` MUST execute `window.renderApplyNowButton(resolvedServiceId)` and MUST NOT call `window.openApplicationModal` automatically.
  - The master system prompt in `system_prompt.js` MUST instruct the voice AI to inform the user that the "Apply Now" button has been displayed on their screen for them to click.
  - Always run `node patch_agent.js` after updating system prompt rules to synchronize the remote ElevenLabs voice agent.

## 8. Service Application Resolution Integrity & Zero Fallback Hallucination
* **Constraint**: NEVER hardcode or default to a specific service ID (such as `bakery_license` or `small_facilities_inspection_certificate`) inside `trigger_service_application` or service resolution functions when a user's service request is un-resolved. Doing so causes the system to render the wrong service button when the user requests an un-matched or differently phrased service (e.g. Gas Station License / تصريح محطات وقود).
* **Solution**:
  - `trigger_service_application` MUST use normalized token matching and context phrase boosters (`isGasStation`, `isGasShop`, `isBakery`, `isGold`, `isTrainee`).
  - If a service cannot be identified with high confidence, `trigger_service_application` MUST return an explicit prompt instructing the AI agent to ask the user to specify which Civil Defense service they wish to apply for.

## 9. Strict Prohibition on Automatic Git Pushes
* **Constraint**: The assistant MUST NEVER execute `git push` or push changes to the remote GitHub repository automatically or unprompted.
* **Solution**:
  - `git push` MUST ONLY be executed when the user explicitly requests or commands you to push changes to the remote repository.
  - Making code edits, building features, running tests, or performing local operations must NEVER automatically initiate a remote git push.

## 10. Strict SMS Notification Policy (Maximum Two SMS Messages per Client Lifecycle)
* **Constraint**: NO SMS is ever permitted to be sent to a client except for exactly TWO lifecycle events:
  1. **SMS 1**: Upon **New Application Creation** (initial submission confirmation).
  2. **SMS 2**: Upon **Final Decision Taken** (`Approved` or `Rejected`).
  * **Strict Limit**: Under NO circumstances should SMS be sent for intermediate statuses (`Modification Requested`, `Under Review`, `In Progress`, `Under Inspection`, etc.). The total SMS count per client application is strictly capped at **TWO (2)**.
* **Solution**:
  - In `server.js`, `executeAdminQuickAction` and all notification handlers MUST enforce `isFinalDecision = (status === 'Approved' || status === 'Rejected')` before triggering SMS.
  - In `workflow_service_applications.json`, `Filter Submit SMS` and `Filter Alert SMS` MUST strictly suppress SMS dispatch on all intermediate statuses.

## 11. Universal Email Notification Policy (All Application Statuses)
* **Constraint**: ALL status changes and lifecycle updates of an application (Column M in `ServiceApplications` sheet) MUST be immediately reflected on and sent to the Client's registered Email.
* **Solution**:
  - Every status change (`Submitted`, `Under Review`, `In Progress`, `Under Inspection`, `Modification Requested`, `Modification Resubmitted`, `Approved`, `Rejected`, and any custom status in Column M) must trigger instant branded email dispatch via `sendUserApplicationStatusEmail` and the active n8n email workflow engine.

## 13. Primary Email Sender & Brevo API Integration Policy
* **Brevo API Engine**: Email delivery is routed via Brevo REST API v3 (`https://api.brevo.com/v3/smtp/email`) using the authenticated API key stored in `process.env.BREVO_API_KEY`.
* **Sender Identity**: Dispatches with Display Name `"Bahrain Civil Defense Support"` and Reply-To `"support@bhcdai.com"`.
* **Domain Authentication (Cloudflare DNS Records)**: To send directly with `support@bhcdai.com` as the envelope sender without Brevo rejection, the following 4 DNS records must be configured in Cloudflare DNS for `bhcdai.com`:
  1. `CNAME` Host: `brevo1._domainkey` -> Target: `b1.bhcdai-com.dkim.brevo.com` (Proxy: DNS Only)
  2. `CNAME` Host: `brevo2._domainkey` -> Target: `b2.bhcdai-com.dkim.brevo.com` (Proxy: DNS Only)
  3. `TXT` Host: `@` -> Target: `brevo-code:59d19b6356702196a3a4806645d9dde7`
  4. `TXT` Host: `_dmarc` -> Target: `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`
* **Active Verified Fallback**: Until the DNS records above propagate in Brevo, `mnaaaei@gmail.com` serves as the active verified sender identity (displaying `"Bahrain Civil Defense Support"` with replies directed to `support@bhcdai.com`).

## 14. Chat History & Transcript Request Endpoint
* **Constraint**: Chat history and transcript exports MUST be available both automatically (on post-call AI request) and on-demand via the web endpoint `POST /api/send-transcript`.
* **Payload**: Accepts `{ email, clientName, phoneNumber, transcriptHtml, transcriptText }` and dispatches branded Cairo HTML emails with crest logos, dialogue bubbles, and timestamps from `support@bhcdai.com`.







