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
