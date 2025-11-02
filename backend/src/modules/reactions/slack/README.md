# Slack Reaction: Message Sending

## Overview

The `SLACK_SEND_MESSAGE` reaction allows sending messages to specified Slack channels. This reaction uses the Slack Web API to post messages with customization options.

## Configuration

### Required Parameters

- **channelId** (string): The identifier of the Slack channel where to send the message
  - Format: `C1234567890` (public channel), `G1234567890` (private group), `D1234567890` (direct message)
  - Example: `C1234567890`

- **message** (string): The content of the message to send
  - Maximum length: 40,000 characters
  - Supports action placeholders (ex: `{{message_text}}`)

### Optional Parameters

- **username** (string): Custom username for the bot
  - Example: `"AREA Bot"`
  - If not specified, uses the bot's default name

- **iconEmoji** (string): Custom emoji for the bot's icon
  - Format: `:emoji_name:`
  - Example: `":robot_face:"`
  - If not specified, uses the bot's default icon

## How it Works

### Sending Process

1. **Validation**: Check required configuration
2. **Authentication**: Verify that Slack account is linked
3. **Slack API**: Call to `chat.postMessage` with parameters
4. **Return**: Confirmation with message timestamp

### Return Codes

The reaction returns an object with:
- **success** (boolean): `true` if sent successfully, `false` otherwise
- **messageTs** (string): Timestamp of the sent message (if success)
- **error** (string): Detailed error message (if failure)

### Placeholder Handling

The reaction supports action placeholders in the message:

```json
{
  "channelId": "C1234567890",
  "message": "New message from {{message_user}}: {{message_text}}"
}
```

## Supported Channel Types

### Public Channels
- **Format**: `C` + 10 alphanumeric characters
- **Example**: `C1234567890`
- **Permission**: Bot must be added to the channel

### Private Groups
- **Format**: `G` + 10 alphanumeric characters
- **Example**: `G1234567890`
- **Permission**: Bot must be invited to the group

### Direct Messages
- **Format**: `D` + 10 alphanumeric characters
- **Example**: `D1234567890`
- **Permission**: Automatic (DM with the bot)

## Prerequisites

### Slack Authentication

The user must have linked their Slack account via OAuth2. The reaction uses stored tokens to access the Slack API.

### Required Permissions

The bot/user must have the following permissions:
- `chat:write`: To send messages
- `chat:write.public`: To send to public channels
- `chat:write.customize`: To customize username and icon (optional)

## Usage Examples

### Simple Message
```json
{
  "channelId": "C1234567890",
  "message": "Hello from AREA!"
}
```

### Message with Placeholders
```json
{
  "channelId": "C1234567890",
  "message": "📧 New email received from {{sender_email}}: {{email_subject}}"
}
```

### Customized Message
```json
{
  "channelId": "C1234567890",
  "message": "🚨 Alert: {{alert_message}}",
  "username": "Alert System",
  "iconEmoji": ":warning:"
}
```

## Error Handling

### Provider Not Linked
If the user hasn't linked their Slack account, the reaction returns:
```json
{
  "success": false,
  "error": "Slack provider not linked"
}
```

### Invalid Channel
If the channel doesn't exist or the bot doesn't have access:
```json
{
  "success": false,
  "error": "Channel not found or access denied"
}
```

### Message Too Long
If the message exceeds 40,000 characters:
```json
{
  "success": false,
  "error": "Message too long (max 40,000 characters)"
}
```

## Limitations

1. **Message length**: Maximum 40,000 characters
2. **Rate limits**: Subject to Slack API rate limits
3. **Permissions**: Bot must have appropriate permissions for each channel type
4. **Formatting**: Basic text formatting (no advanced blocks)

## Debugging

Enable debug logs to see operation details:

```typescript
this.logger.debug(`[Slack] Sending message to channel=${channelId} user=${userId}`);
```

The logs include:
- Channel validation
- API call details
- Success/error responses
- Message timestamps
  "message": "📧 Nouveau mail reçu de {{sender_email}}: {{email_subject}}"
}
```

### Message personnalisé
```json
{
  "channelId": "C1234567890",
  "message": "🎵 Nouvelle chanson likée: {{track_name}} par {{artist_name}}",
  "username": "Spotify Bot",
  "iconEmoji": ":musical_note:"
}
```

### Notification d'alerte
```json
{
  "channelId": "G9876543210",
  "message": "⚠️ ALERTE: {{alert_message}}",
  "username": "Alert System",
  "iconEmoji": ":warning:"
}
```

## Validation de configuration

La réaction inclut une validation complète :

### Erreurs de configuration

- `channelId is required` : ID de canal manquant
- `channelId must be a valid Slack channel ID` : Format invalide
- `message is required` : Message manquant
- `message must be less than 40,000 characters` : Message trop long
- `username must be a string` : Type de username invalide
- `iconEmoji must be a string` : Type d'emoji invalide

### Erreurs d'exécution

- `Slack account not linked` : Compte non lié
- `Slack API error: [detail]` : Erreur de l'API Slack
  - `channel_not_found` : Canal introuvable
  - `not_in_channel` : Bot pas dans le canal
  - `msg_too_long` : Message trop long
  - `rate_limited` : Limite de taux atteinte

## Intégration avec les actions

### Compatible avec toutes les actions

La réaction Slack fonctionne avec toutes les actions disponibles :

#### Gmail → Slack
```json
{
  "action": { /* config Gmail */ },
  "reaction": {
    "channelId": "C1234567890",
    "message": "📧 Nouveau mail de {{sender_name}}: {{email_subject}}"
  }
}
```

#### Discord → Slack
```json
{
  "action": { "channelId": "discord_channel_id" },
  "reaction": {
    "channelId": "C1234567890",
    "message": "💬 Message Discord de {{message_author}}: {{message_content}}"
  }
}
```

#### Spotify → Slack
```json
{
  "action": { /* config Spotify */ },
  "reaction": {
    "channelId": "C1234567890",
    "message": "🎵 {{user_name}} a liké: {{track_name}}",
    "username": "Spotify Bot",
    "iconEmoji": ":musical_note:"
  }
}
```

#### Slack → Slack (Cross-channel)
```json
{
  "action": { "channelId": "C1111111111" },
  "reaction": {
    "channelId": "C2222222222",
    "message": "Relai de #general: {{message_text}} (par {{message_user}})"
  }
}
```

## Gestion des erreurs

### Stratégie de resilience

1. **Validation précoce** : Vérification avant l'envoi
2. **Gestion gracieuse** : Retour d'erreur structuré
3. **Logging détaillé** : Traçabilité pour debugging
4. **Pas de retry automatique** : Évite la duplication

### Messages d'erreur courants

| Erreur API Slack | Cause probable | Solution |
|------------------|----------------|----------|
| `channel_not_found` | Canal supprimé/inexistant | Vérifier l'ID du canal |
| `not_in_channel` | Bot pas invité | Ajouter le bot au canal |
| `msg_too_long` | Message > 40k caractères | Raccourcir le message |
| `rate_limited` | Trop de messages | Attendre et réessayer |
| `token_revoked` | Token invalide | Re-lier le compte Slack |

## Debugging

### Logs disponibles

```typescript
// Succès
this.logger.log(`Successfully sent Slack message to channel ${channelId}, timestamp: ${ts}`);

// Erreurs
this.logger.error(`Slack API error: ${error}`);
this.logger.error(`Failed to send Slack message: ${errorMessage}`);
```

### Variables d'environnement

- `SLACK_CLIENT_ID` : ID client de l'application Slack
- `SLACK_CLIENT_SECRET` : Secret client de l'application Slack
- `SLACK_REDIRECT_URI` : URI de redirection pour OAuth2

## Limitations

1. **Rate limiting** : Soumis aux limites de l'API Slack (1+ message/seconde)
2. **Longueur du message** : Maximum 40 000 caractères
3. **Canaux privés** : Nécessite invitation explicite du bot
4. **Formatting** : Supporte le markdown Slack basique
5. **Pièces jointes** : Non supportées (messages texte uniquement)

## Sécurité

1. **Tokens chiffrés** : Stockage sécurisé des tokens OAuth2
2. **Validation stricte** : Contrôle de tous les paramètres
3. **Pas de XSS** : Échappement automatique par Slack
4. **Audit trail** : Tous les envois sont loggés

Cette réaction offre une intégration complète et robuste avec Slack pour créer des workflows d'automatisation sophistiqués.
