# Réaction Slack : Envoi de messages

## Vue d'ensemble

La réaction `SLACK_SEND_MESSAGE` permet d'envoyer des messages dans les canaux Slack spécifiés. Cette réaction utilise l'API Web de Slack pour poster des messages avec des options de personnalisation.

## Configuration

### Paramètres requis

- **channelId** (string) : L'identifiant du canal Slack où envoyer le message
  - Format : `C1234567890` (canal public), `G1234567890` (groupe privé), `D1234567890` (message direct)
  - Exemple : `C1234567890`

- **message** (string) : Le contenu du message à envoyer
  - Longueur maximale : 40 000 caractères
  - Supporte les placeholders des actions (ex: `{{message_text}}`)

### Paramètres optionnels

- **username** (string) : Nom d'utilisateur personnalisé pour le bot
  - Exemple : `"AREA Bot"`
  - Si non spécifié, utilise le nom par défaut du bot

- **iconEmoji** (string) : Emoji personnalisé pour l'icône du bot
  - Format : `:emoji_name:`
  - Exemple : `":robot_face:"`
  - Si non spécifié, utilise l'icône par défaut du bot

## Fonctionnement

### Processus d'envoi

1. **Validation** : Vérification de la configuration requise
2. **Authentification** : Contrôle que le compte Slack est lié
3. **API Slack** : Appel à `chat.postMessage` avec les paramètres
4. **Retour** : Confirmation avec timestamp du message

### Codes de retour

La réaction retourne un objet avec :
- **success** (boolean) : `true` si envoyé avec succès, `false` sinon
- **messageTs** (string) : Timestamp du message envoyé (si succès)
- **error** (string) : Message d'erreur détaillé (si échec)

### Gestion des placeholders

La réaction supporte les placeholders des actions dans le message :

```json
{
  "channelId": "C1234567890",
  "message": "Nouveau message de {{message_user}}: {{message_text}}"
}
```

## Types de canaux supportés

### Canaux publics
- **Format** : `C` + 10 caractères alphanumériques
- **Exemple** : `C1234567890`
- **Permission** : Le bot doit être ajouté au canal

### Groupes privés
- **Format** : `G` + 10 caractères alphanumériques
- **Exemple** : `G1234567890`
- **Permission** : Le bot doit être invité au groupe

### Messages directs
- **Format** : `D` + 10 caractères alphanumériques
- **Exemple** : `D1234567890`
- **Permission** : Automatique (DM avec le bot)

## Prérequis

### Authentification Slack

L'utilisateur doit avoir lié son compte Slack via OAuth2. La réaction utilise les tokens stockés pour accéder à l'API Slack.

### Permissions requises

Le bot/utilisateur doit avoir les permissions suivantes :
- `chat:write` : Pour envoyer des messages
- `chat:write.public` : Pour envoyer dans les canaux publics
- `chat:write.customize` : Pour personnaliser username et icon (optionnel)

## Exemples d'utilisation

### Message simple
```json
{
  "channelId": "C1234567890",
  "message": "Hello from AREA!"
}
```

### Message avec placeholders
```json
{
  "channelId": "C1234567890",
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
