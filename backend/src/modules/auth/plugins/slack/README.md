# Slack Hybrid OAuth Integration (Bot + User Tokens)

Ce guide explique comment configurer l'authentification Slack avec une approche **HYBRIDE** utilisant à la fois Bot Tokens et User Tokens, parfait pour une application IFTTT-like.

## Architecture Hybride pour IFTTT

**Cette implémentation demande les DEUX types de tokens** :

### Bot Token (workspace-level)
- 🎯 **Usage**: REACTIONS (IF) - Écouter des événements
- ✅ Accès aux channels même si l'utilisateur n'y est pas
- ✅ Ne expire jamais
- ✅ Idéal pour écouter des messages, réactions, etc.
- 📍 Token `xoxb-...`

### User Token (individual)
- 🎯 **Usage**: ACTIONS (THEN) - Effectuer des actions
- ✅ Actions au nom de l'utilisateur
- ✅ Unlink individuel propre
- ⏱️ Expire et se refresh automatiquement
- 📍 Token `xoxp-...`

### Exemple de workflow IFTTT
```
IF: Message contient "urgent" dans #support (Bot Token écoute)
THEN: Poste dans #incidents (User Token écrit au nom du user)
```

## Table des matières

1. [Création de l'application Slack](#création-de-lapplication-slack)
2. [Configuration OAuth & Permissions](#configuration-oauth--permissions)
3. [Variables d'environnement](#variables-denvironnement)
4. [Scopes disponibles](#scopes-disponibles)
5. [Test de l'intégration](#test-de-lintégration)

---

## Création de l'application Slack

### 1. Créer une application Slack

1. Accédez à [https://api.slack.com/apps](https://api.slack.com/apps)
2. Cliquez sur **"Create New App"**
3. Sélectionnez **"From scratch"**
4. Donnez un nom à votre application (ex: "AREA Bot")
5. Sélectionnez le workspace de développement
6. Cliquez sur **"Create App"**

### 2. Récupérer les credentials

Dans la section **"Basic Information"** > **"App Credentials"**:

- Notez le **Client ID** → Utilisez-le pour `SLACK_CLIENT_ID`
- Notez le **Client Secret** (cliquez sur "Show" pour le révéler) → Utilisez-le pour `SLACK_CLIENT_SECRET`

Ces deux credentials suffisent pour l'intégration OAuth.

---

## Configuration OAuth & Permissions

### 1. Activer le Bot User (IMPORTANT)

**Avant toute chose**, tu dois activer le bot :

1. Dans le menu de gauche, clique sur **"App Home"**
2. Scrolle jusqu'à **"Bot Users"**
3. Clique sur **"Add Legacy Bot User"** ou **"Review Scopes to Add"**
4. Configure le bot :
   - **Display Name** : `AREA Bot` (ou ce que tu veux)
   - **Default Username** : `area-bot`
5. Clique sur **"Add Bot User"** ou **"Save Changes"**

**Sans cette étape, l'erreur "doesn't have a bot user to install" apparaîtra !**

### 2. Configurer les Redirect URLs

Dans la section **"OAuth & Permissions"**:

1. Scrollez jusqu'à **"Redirect URLs"**
2. Cliquez sur **"Add New Redirect URL"**
3. Ajoutez votre URL de callback selon votre environnement:

   **Pour le développement local**:
   ```
   http://localhost:3000/auth/slack/callback
   ```

   **Pour le développement avec ngrok** (recommandé pour tester):
   ```
   https://your-subdomain.ngrok-free.app/auth/slack/callback
   ```

   **Pour la production**:
   ```
   https://votre-domaine.com/auth/slack/callback
   ```

4. Cliquez sur **"Add"** puis **"Save URLs"**

💡 **Astuce ngrok**: Pour tester OAuth en développement, utilisez ngrok pour exposer votre backend local :
```bash
ngrok http 3000
```
Puis utilisez l'URL HTTPS fournie comme redirect URI.

### 3. Configurer les Scopes (Bot ET User)

**IMPORTANT**: Nous demandons les **deux types de scopes**.

#### Bot Token Scopes

Dans **"OAuth & Permissions"** > **"Scopes"** > **"Bot Token Scopes"**:

- `channels:read` - Lire les canaux (pour les réactions/IF)
- `channels:history` - Lire l'historique des messages
- `chat:write` - Écrire des messages en tant que bot
- `users:read` - Lire les infos utilisateurs
- `team:read` - Lire les infos du workspace

#### User Token Scopes

Dans **"OAuth & Permissions"** > **"Scopes"** > **"User Token Scopes"**:

- `channels:read` - Lire les canaux de l'utilisateur
- `channels:history` - Lire l'historique
- `chat:write` - Écrire au nom de l'utilisateur (pour les actions/THEN)
- `users:read` - Lire les infos utilisateurs

**Les deux sont requis** pour le fonctionnement complet de l'intégration IFTTT.

### 4. Activer Event Subscriptions (Optionnel)

Si vous souhaitez recevoir des événements en temps réel:

1. Allez dans **"Event Subscriptions"**
2. Activez **"Enable Events"**
3. Ajoutez votre Request URL:
   ```
   https://votre-domaine.com/slack/events
   ```
4. Souscrivez aux événements bot nécessaires (ex: `message.channels`, `message.im`)

---

## Variables d'environnement

Ajoutez les variables suivantes à votre fichier `.env`:

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
