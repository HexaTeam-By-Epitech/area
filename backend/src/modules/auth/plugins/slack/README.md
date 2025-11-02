# Slack OAuth — Quick Setup

Minimal steps to integrate Slack with this project (hybrid Bot + User tokens).

## 1) Create the Slack app
- https://api.slack.com/apps → "Create New App"
- Name it, select your workspace, create

## 2) Get your credentials
- Client ID → SLACK_CLIENT_ID
- Client Secret → SLACK_CLIENT_SECRET

## 3) Set Redirect URIs
In "OAuth & Permissions" > "Redirect URLs":
- Dev: http://localhost:3000/auth/slack/callback
- Ngrok: https://<subdomain>.ngrok-free.app/auth/slack/callback
- Prod: https://your-domain.com/auth/slack/callback

## 4) Add scopes
In "OAuth & Permissions" > "Scopes":
- Bot Token Scopes: channels:read, channels:history, chat:write, users:read, team:read
- User Token Scopes: channels:read, channels:history, chat:write, users:read

## 5) Environment variables
Add to backend `.env`:
```
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback
SLACK_BOT_SCOPES=channels:read,channels:history,chat:write,users:read,team:read
SLACK_USER_SCOPES=channels:read,channels:history,chat:write,users:read
```
Make sure SLACK_REDIRECT_URI matches exactly the one configured in Slack.

## 6) Test the OAuth flow
- Start the backend
- Open the authorization URL:
  - GET /auth/slack/link?userId=<your-user-id>
- Authorize the app on Slack
- After consent, you are redirected to /auth/slack/callback and the token is stored

## 7) Check linking
- GET /auth/linked-providers (with JWT) → "slack" should appear

## 8) Quick usage of tokens
- Bot token: listen to events (REACTIONS/IF)
- User token: act on behalf of the user (ACTIONS/THEN)

## 9) Quick troubleshooting
- "doesn't have a bot user to install": add a Bot User in "App Home"
- "invalid_redirect_uri": check the URL
- "insufficient_scope": check the scopes

That's it. If the link works, you can use the Slack endpoints of the backend for actions/reactions.
