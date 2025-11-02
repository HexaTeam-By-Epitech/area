# Action Slack : Détection de nouveaux messages

## Vue d'ensemble

L'action `SLACK_NEW_MESSAGE` permet de détecter l'arrivée de nouveaux messages dans un canal Slack spécifique. Cette action utilise un système de polling pour vérifier périodiquement la présence de nouveaux messages.

## Configuration

### Paramètres requis

- **channelId** (string) : L'identifiant du canal Slack à surveiller
  - Format : `C1234567890` (commence par 'C' suivi de chiffres)
  - Exemple : `C1234567890`

### Paramètres optionnels

Si aucun `channelId` n'est fourni, l'action utilisera le canal `general` par défaut.

## Fonctionnement

### Stratégie de polling

1. **Vérification périodique** : L'action interroge l'API Slack toutes les 5 secondes (configurable via `SLACK_POLL_INTERVAL_MS`)
2. **Comparaison temporelle** : Compare le timestamp du message le plus récent avec celui mis en cache dans Redis
3. **Déclenchement** : Retourne un code 0 (trigger) si un nouveau message est détecté

### Codes de retour

- **0** : Nouveau message détecté (déclenchement de la réaction)
- **1** : Aucun changement détecté ou initialisation de base
- **-1** : Provider Slack non lié pour l'utilisateur

### Cache Redis

- **Clé** : `slack:last_message_ts:${userId}:${channelId}`
- **Valeur** : Timestamp du dernier message traité
- **Gestion du vide** : Stocke une chaîne vide si le canal est vide

## Placeholders disponibles

L'action fournit les placeholders suivants pour les réactions :

| Placeholder | Description | Exemple |
|-------------|-------------|---------|
| `message_text` | Contenu du nouveau message Slack | `"Hello everyone!"` |
| `message_user` | ID de l'utilisateur qui a envoyé le message | `"U1234567890"` |
| `message_timestamp` | Timestamp du message | `"1640995200.123456"` |
| `channel_id` | ID du canal où le message a été posté | `"C1234567890"` |

## Utilisation dans les réactions

Vous pouvez utiliser ces placeholders dans la configuration de vos réactions :

```json
{
  "subject": "Nouveau message Slack",
  "body": "{{message_user}} a écrit dans {{channel_id}}: {{message_text}}"
}
```

## Prérequis

### Authentification Slack

L'utilisateur doit avoir lié son compte Slack via OAuth2. L'action utilise les tokens stockés pour accéder à l'API Slack.

### Permissions requises

Le bot/utilisateur doit avoir les permissions suivantes :
- `channels:history` : Pour lire l'historique des messages publics
- `groups:history` : Pour lire l'historique des canaux privés
- `im:history` : Pour lire l'historique des messages directs

## Variables d'environnement

- `SLACK_POLL_INTERVAL_MS` : Intervalle de polling en millisecondes (défaut: 5000)
- `SLACK_CLIENT_ID` : ID client de l'application Slack
- `SLACK_REDIRECT_URI` : URI de redirection pour OAuth2

## Gestion des erreurs

### Erreurs temporaires

Les erreurs temporaires de l'API Slack (timeouts, erreurs réseau) sont traitées comme "aucun changement" pour éviter de déclencher des réactions en boucle.

### Provider non lié

Si l'utilisateur n'a pas lié son compte Slack, l'action retourne `-1` et log un message de debug.

### Canal introuvable

Si le canal spécifié n'existe pas ou si l'utilisateur n'y a pas accès, l'API Slack retournera une liste vide, traitée comme "aucun message".

## Exemple d'utilisation

```typescript
// Configuration de l'action
const actionConfig = {
  channelId: "C1234567890" // Canal #general
};

// L'action détectera automatiquement les nouveaux messages
// et déclenchera la réaction configurée avec les placeholders
```

## Limitations

1. **Fréquence de polling** : Limitée par les rate limits de l'API Slack
2. **Historique** : Ne déclenche pas sur les messages historiques lors de la première initialisation
3. **Types de messages** : Détecte tous les types de messages (ne filtre pas par type)
4. **Canaux multiples** : Une instance par canal (pas de surveillance multi-canaux)

## Debugging

Activez les logs debug pour voir le détail des opérations :

```typescript
this.logger.debug(`[Slack] Listing latest messages for user=${userId} channel=${channelId}`);
```

Les logs incluent :
- État du cache Redis
- Nombre de messages récupérés
- Timestamps comparés
- Décisions de déclenchement
