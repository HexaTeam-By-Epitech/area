# Slack Hybrid OAuth Integration (Bot + User Tokens)

This guide explains how to configure Slack authentication with a **HYBRID** approach using both Bot Tokens and User Tokens, perfect for an IFTTT-like application.

## Hybrid Architecture for IFTTT

**This implementation requests BOTH types of tokens**:

### Bot Token (workspace-level)
- 🎯 **Usage**: REACTIONS (IF) - Listen to events
- ✅ Access to channels even if user is not in them
- ✅ Never expires
- ✅ Ideal for listening to messages, reactions, etc.
- 📍 Token `xoxb-...`

### User Token (individual)
- 🎯 **Usage**: ACTIONS (THEN) - Perform actions
- ✅ Actions on behalf of the user
- ✅ Clean individual unlinking
- ⏱️ Expires and refreshes automatically
- 📍 Token `xoxp-...`

### IFTTT Workflow Example
```
IF: Message contains "urgent" in #support (Bot Token listens)
THEN: Post in #incidents (User Token writes on behalf of user)
```

## Table of Contents

1. [Creating the Slack Application](#creating-the-slack-application)
2. [OAuth & Permissions Configuration](#oauth--permissions-configuration)
3. [Environment Variables](#environment-variables)
4. [Available Scopes](#available-scopes)
5. [Integration Testing](#integration-testing)

---

## Creating the Slack Application

### 1. Create a Slack Application

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click on **"Create New App"**
3. Select **"From scratch"**
4. Give your application a name (ex: "AREA Bot")
5. Select the development workspace
6. Click on **"Create App"**

### 2. Get the Credentials

In the **"Basic Information"** > **"App Credentials"** section:

- Note the **Client ID** → Use it for `SLACK_CLIENT_ID`
- Note the **Client Secret** (click "Show" to reveal it) → Use it for `SLACK_CLIENT_SECRET`

These two credentials are sufficient for OAuth integration.

---

## OAuth & Permissions Configuration

### 1. Enable Bot User (IMPORTANT)

**First of all**, you must enable the bot:

1. In the left menu, click on **"App Home"**
2. Scroll down to **"Bot Users"**
3. Click on **"Add Legacy Bot User"** or **"Review Scopes to Add"**
4. Configure the bot:
   - **Display Name**: `AREA Bot` (or whatever you want)
   - **Default Username**: `area-bot`
5. Click on **"Add Bot User"** or **"Save Changes"**

**Without this step, the error "doesn't have a bot user to install" will appear!**

### 2. Configure Redirect URLs

In the **"OAuth & Permissions"** section:

1. Scroll down to **"Redirect URLs"**
2. Click on **"Add New Redirect URL"**
3. Add your callback URL according to your environment:

   **For local development**:
   ```
   http://localhost:3000/auth/slack/callback
   ```

   **For development with ngrok** (recommended for testing):
   ```
   https://your-subdomain.ngrok-free.app/auth/slack/callback
   ```

   **For production**:
   ```
   https://your-domain.com/auth/slack/callback
   ```

4. Click on **"Add"** then **"Save URLs"**

💡 **ngrok Tip**: To test OAuth in development, use ngrok to expose your local backend:
```bash
ngrok http 3000
```
Then use the provided HTTPS URL as redirect URI.

### 3. Configure Scopes (Bot AND User)

**IMPORTANT**: We request **both types of scopes**.

#### Bot Token Scopes

In **"OAuth & Permissions"** > **"Scopes"** > **"Bot Token Scopes"**:

- `channels:read` - Read channels (for reactions/IF)
- `channels:history` - Read message history
- `chat:write` - Write messages as bot
- `users:read` - Read user information
- `team:read` - Read workspace information

#### User Token Scopes

In **"OAuth & Permissions"** > **"Scopes"** > **"User Token Scopes"**:

- `channels:read` - Read user's channels
- `channels:history` - Read history
- `chat:write` - Write on behalf of user (for actions/THEN)
- `users:read` - Read user information

**Both are required** for complete IFTTT integration functionality.

### 4. Enable Event Subscriptions (Optional)

If you want to receive real-time events:

1. Go to **"Event Subscriptions"**
2. Enable **"Enable Events"**
3. Add your Request URL:
   ```
   https://your-domain.com/slack/events
   ```
4. Subscribe to necessary bot events (ex: `message.channels`, `message.im`)

---

## Environment Variables

Add the following variables to your `.env` file:

```env
# Slack OAuth Configuration
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback

# Optional: Custom scopes (if different from defaults)
SLACK_BOT_SCOPES=channels:read,channels:history,chat:write,users:read,team:read
SLACK_USER_SCOPES=channels:read,channels:history,chat:write,users:read
```

**Important**: Replace `your_client_id_here` and `your_client_secret_here` with the actual values from your Slack app.

---

## Available Scopes

### Bot Token Scopes
| Scope | Description | Required for |
|-------|-------------|-------------|
| `channels:read` | Read public channel information | Listing channels |
| `channels:history` | Read public channel message history | Message listening (IF) |
| `groups:read` | Read private channel information | Private channels |
| `groups:history` | Read private channel history | Private message listening |
| `chat:write` | Send messages as bot | Bot messaging |
| `users:read` | Read user information | User data |
| `team:read` | Read workspace information | Workspace data |

### User Token Scopes
| Scope | Description | Required for |
|-------|-------------|-------------|
| `channels:read` | Read user's channels | User channel access |
| `channels:history` | Read message history | User message access |
| `chat:write` | Write messages as user | User actions (THEN) |
| `users:read` | Read user profiles | User information |

---

## Integration Testing

### 1. Test OAuth Flow

1. Start your backend server
2. Navigate to: `http://localhost:3000/auth/slack/link`
3. You should be redirected to Slack's authorization page
4. Authorize the application
5. You should be redirected back with success

### 2. Verify Token Storage

Check that both tokens are properly stored:

```bash
# Check in your database or logs that you have:
# - Bot token (xoxb-...)
# - User token (xoxp-...)
# - Refresh token for user token
```

### 3. Test API Calls

Test both token types work:

```typescript
// Test Bot Token
const botResponse = await slackApi.conversations.list({
  token: botToken
});

// Test User Token
const userResponse = await slackApi.chat.postMessage({
  token: userToken,
  channel: 'C1234567890',
  text: 'Test message'
});
```

---

## Troubleshooting

### Common Errors

**Error**: "doesn't have a bot user to install"
- **Solution**: Make sure you've added a Bot User in App Home

**Error**: "invalid_redirect_uri"
- **Solution**: Verify your redirect URI exactly matches what's configured in Slack

**Error**: "insufficient_scope"
- **Solution**: Check that all required scopes are added for both Bot and User tokens

**Error**: "token_revoked"
- **Solution**: User needs to re-authorize the application

### Debug Mode

Enable debug logging to troubleshoot issues:

```env
LOG_LEVEL=debug
```

This will show detailed OAuth flow information and API calls.

---

## Security Best Practices

1. **Store tokens securely**: Encrypt tokens in your database
2. **Validate redirect URIs**: Always validate callback URLs
3. **Handle token refresh**: Implement automatic user token refresh
4. **Scope minimal permissions**: Only request scopes you actually need
5. **Monitor for revoked tokens**: Handle token revocation gracefully

---

## Next Steps

After successful integration:

1. Implement your IFTTT-style actions and reactions
2. Set up proper error handling and logging
3. Test with real Slack workspaces
4. Deploy to production with HTTPS
5. Monitor usage and performance

The hybrid token approach gives you maximum flexibility for building powerful Slack automations! 🚀

```env
# Slack OAuth Configuration (Hybrid: Bot + User Tokens)
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback
```

### Configuration selon l'environnement

**Développement local** (port par défaut 3000):
```env
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback
```

**Développement avec ngrok** (pour tester avec Slack):
```env
SLACK_REDIRECT_URI=https://your-subdomain.ngrok-free.app/auth/slack/callback
```

**Production**:
```env
SLACK_REDIRECT_URI=https://votre-domaine.com/auth/slack/callback
```

⚠️ **Important**: La `SLACK_REDIRECT_URI` doit **exactement** correspondre à celle configurée dans votre Slack App (section "OAuth & Permissions" > "Redirect URLs").

---

## Scopes disponibles

### Scopes de base (lecture)

| Scope | Description |
|-------|-------------|
| `channels:read` | Voir les canaux publics et leurs métadonnées |
| `channels:history` | Voir les messages et le contenu des canaux publics |
| `users:read` | Voir les informations de base des utilisateurs |
| `users:read.email` | Voir les adresses email des membres |
| `team:read` | Voir les informations du workspace |

### Scopes d'écriture

| Scope | Description |
|-------|-------------|
| `chat:write` | Envoyer des messages en tant que bot |
| `chat:write.public` | Envoyer des messages dans les canaux publics sans être invité |
| `chat:write.customize` | Envoyer des messages avec un nom et une icône personnalisés |

### Scopes pour les messages privés

| Scope | Description |
|-------|-------------|
| `groups:read` | Voir les canaux privés auxquels le bot est ajouté |
| `groups:history` | Voir les messages dans les canaux privés |
| `groups:write` | Gérer les canaux privés |
| `im:read` | Voir les messages directs avec le bot |
| `im:history` | Voir l'historique des messages directs |
| `im:write` | Envoyer des messages directs |

### Scopes avancés

| Scope | Description |
|-------|-------------|
| `files:read` | Voir les fichiers partagés dans les canaux |
| `files:write` | Uploader et partager des fichiers |
| `reactions:read` | Voir les réactions sur les messages |
| `reactions:write` | Ajouter/supprimer des réactions |
| `pins:read` | Voir les messages épinglés |
| `pins:write` | Épingler/désépingler des messages |
| `reminders:read` | Voir les rappels |
| `reminders:write` | Créer des rappels |

### Personnaliser les scopes

Pour personnaliser les scopes demandés, modifiez le code dans `slack-linking.ts:50-64`:

```typescript
// Bot scopes: For listening to events (Reactions/IF)
const botScopes = [
  'channels:read',
  'channels:history',
  'chat:write',
  // Ajoutez vos bot scopes ici
].join(',');

// User scopes: For acting as the user (Actions/THEN)
const userScopes = [
  'channels:read',
  'chat:write',
  // Ajoutez vos user scopes ici
].join(',');
```

---

## Test de l'intégration

### 1. Lancer le backend

```bash
cd backend
npm run start:dev
```

### 2. Tester le flow OAuth

1. Faites une requête pour obtenir l'URL d'autorisation:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/auth/slack/url
   ```

2. Ouvrez l'URL retournée dans votre navigateur

3. Autorisez l'application dans votre workspace Slack

4. Vous serez redirigé vers votre frontend avec les paramètres de succès/erreur

### 3. Vérifier le linking

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/auth/linked-providers
```

Vous devriez voir `"slack"` dans la liste des providers liés.

### 4. Obtenir le token d'accès

Le token bot est stocké de manière chiffrée en base de données et peut être récupéré via:

```typescript
// Dans votre code NestJS
const accessToken = await this.authService.getCurrentAccessToken('slack', userId);
```

---

## Utilisation des tokens

Une fois le linking effectué, vous avez accès aux deux types de tokens :

### User Token (pour les actions)

```typescript
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { SlackLinking } from '../auth/plugins/slack/slack-linking';

@Injectable()
export class SlackActionsService {
  constructor(
    private readonly authService: AuthService,
    private readonly slackLinking: SlackLinking,
  ) {}

  // ACTIONS (THEN): Poster un message au nom de l'utilisateur
  async postMessageAsUser(userId: string, channel: string, text: string) {
    const userToken = await this.slackLinking.getCurrentAccessToken(userId);

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text }),
    });

    return response.json();
  }
}
```

### Bot Token (pour les réactions)

```typescript
@Injectable()
export class SlackReactionsService {
  constructor(private readonly slackLinking: SlackLinking) {}

  // REACTIONS (IF): Écouter les messages avec le bot
  async listenToChannel(userId: string, channelId: string) {
    const botToken = await this.slackLinking.getBotToken(userId);

    const response = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}`, {
      headers: { 'Authorization': `Bearer ${botToken}` },
    });

    return response.json();
  }

  // Setup webhook pour recevoir des événements en temps réel
  async setupEventListener(userId: string) {
    const botToken = await this.slackLinking.getBotToken(userId);
    // Configure Slack Events API avec ce token
    // Les événements seront envoyés à votre endpoint webhook
  }
}
```

---

## Points importants

### Stockage des tokens

**User Token** (`slack` provider):
- `providerUserId`: `U1234567890@T9876543210` (slackUserId@teamId)
- Expire après ~12h, refresh automatique
- Utilisé pour les actions au nom de l'utilisateur

**Bot Token** (`slack_bot` provider):
- `providerUserId`: `T9876543210` (teamId uniquement)
- Ne expire jamais
- Partagé entre users du même workspace (Slack gère les duplications)

### Unlink comportement

Quand un user fait `DELETE /auth/slack/link`:
- ✅ Son user token est supprimé (accès personnel révoqué)
- ⚠️ Le bot token reste (peut être utilisé par d'autres users du workspace)
- ℹ️ Pour supprimer complètement le bot, l'admin doit le désinstaller depuis Slack

### Gestion multi-utilisateurs

Si 3 users du même workspace linkent:
- Chacun a son propre user token (`U111@T123`, `U222@T123`, `U333@T123`)
- Le bot token (`T123`) sera tenté d'être créé 3 fois
- La 2ème et 3ème tentative échoueront (c'est normal, on ignore l'erreur)
- Tous les 3 peuvent utiliser le même bot token pour les réactions

### Sécurité

- Les tokens sont stockés de manière chiffrée via AES-GCM
- Le state JWT expire après 10 minutes
- Vérifiez toujours les signatures des webhooks Slack avec le Signing Secret

### Limitations

- Les Bot Tokens ne peuvent pas accéder aux messages des canaux privés sans être invités
- Certaines actions nécessitent des permissions workspace-level accordées par un admin
- Rate limits Slack: ~1 requête/seconde par workspace (varie selon la méthode)

---

## Références

- [Slack API Documentation](https://api.slack.com/docs)
- [OAuth 2.0 Guide](https://api.slack.com/authentication/oauth-v2)
- [Bot Token Scopes](https://api.slack.com/scopes)
- [Rate Limits](https://api.slack.com/docs/rate-limits)

---

## Support

Pour toute question ou problème:
1. Vérifiez les logs du backend
2. Consultez la documentation Slack API
3. Vérifiez que tous les scopes nécessaires sont bien configurés
4. Testez avec les outils de débogage Slack (https://api.slack.com/tools)
