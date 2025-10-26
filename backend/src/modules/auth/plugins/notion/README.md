# Notion OAuth — Quick Setup

Minimal steps to create and use a Notion integration with this project.

## 1) Create the integration
- Go to https://www.notion.so/my-integrations → + New integration
- Name it, select your workspace, Save

## 2) Grab credentials
- OAuth client ID → NOTION_CLIENT_ID
- OAuth client secret → NOTION_CLIENT_SECRET

## 3) Redirect URI (must match exactly)
Add one or more Redirect URIs in “Distribution”:
- Dev: http://localhost:3000/auth/notion/callback
- Ngrok: https://<subdomain>.ngrok-free.app/auth/notion/callback
- Prod: https://your-domain.com/auth/notion/callback

## 4) Capabilities (minimum)
Enable in the integration settings:
- Content: Read content, Insert content, Update content
- User: Read user information without email (optional)

## 5) Share your pages/databases
For the integration to access resources, you must share them with the integration in Notion:
Page → … menu → Add connections → select your integration.

## 6) Environment variables
Add to backend .env:
```
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=http://localhost:3000/auth/notion/callback
```
Ensure NOTION_REDIRECT_URI exactly matches one of your Redirect URIs in Notion.

## 7) Test the link flow
- Start the backend
- Open consent URL and connect your Notion:
  - GET /auth/notion/link?userId=<your-user-id>
- After consent, you’re redirected to /auth/notion/callback and the token is stored.

## 8) Quick API notes
- Headers: Authorization: Bearer <access_token>, Notion-Version: 2022-06-28
- Tokens don’t expire (until revoked)
- Rate limit ≈ 3 req/s

## 9) Debug quick refs
- 401 Unauthorized: token revoked → reconnect user
- 404 Object not found: page/db not shared with integration → Share it (Add connections)
- invalid_client / redirect_uri_mismatch: exact match required (protocol, host, path)

That’s it. If the link works, you can list databases via the backend Notion endpoints and start using actions/reactions.
