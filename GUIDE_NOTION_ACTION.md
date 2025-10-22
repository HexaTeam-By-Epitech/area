# Guide pratique : Créer une AREA avec Notion Database

## 📋 Prérequis

1. Avoir un compte Notion lié à l'application
2. Avoir une database Notion avec des données

## 🚀 Étapes pour créer une AREA Notion

### Étape 1 : Lier ton compte Notion

Si ce n'est pas déjà fait :

```bash
GET /auth/notion/link
```

Cela te redirigera vers Notion pour autoriser l'accès.

### Étape 2 : Récupérer tes databases disponibles

```bash
GET /actions/notion/databases
Authorization: Bearer <ton_jwt_token>
```

**Réponse :**
```json
{
  "databases": [
    {
      "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "title": "Mes Tâches",
      "url": "https://www.notion.so/a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d",
      "created_time": "2023-12-10T15:30:00.000Z",
      "last_edited_time": "2024-10-22T10:15:00.000Z"
    },
    {
      "id": "f9e8d7c6-b5a4-4321-9876-543210fedcba",
      "title": "Projets Clients",
      "url": "https://www.notion.so/f9e8d7c6b5a443219876543210fedcba",
      "created_time": "2023-11-05T09:20:00.000Z",
      "last_edited_time": "2024-10-21T16:45:00.000Z"
    }
  ]
}
```

### Étape 3 : (Optionnel) Voir les placeholders disponibles

Pour savoir quels placeholders tu pourras utiliser dans ta réaction :

```bash
GET /actions/notion/databases/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/schema
Authorization: Bearer <ton_jwt_token>
```

**Réponse :**
```json
{
  "databaseId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "title": "Mes Tâches",
  "url": "https://www.notion.so/a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d",
  "properties": [
    {
      "name": "Name",
      "type": "title",
      "placeholderKey": "NOTION_PROP_NAME"
    },
    {
      "name": "Status",
      "type": "select",
      "placeholderKey": "NOTION_PROP_STATUS"
    },
    {
      "name": "Assigné à",
      "type": "people",
      "placeholderKey": "NOTION_PROP_ASSIGNÉ_À"
    },
    {
      "name": "Date d'échéance",
      "type": "date",
      "placeholderKey": "NOTION_PROP_DATE_D_ÉCHÉANCE"
    }
  ],
  "baseProperties": [
    { "key": "NOTION_ITEM_ID", "description": "The unique ID of the database item" },
    { "key": "NOTION_ITEM_URL", "description": "The URL to view the item in Notion" },
    { "key": "NOTION_ITEM_CREATED_TIME", "description": "When the item was created" },
    { "key": "NOTION_ITEM_LAST_EDITED_TIME", "description": "When the item was last edited" },
    { "key": "NOTION_DATABASE_ID", "description": "The ID of the database" }
  ]
}
```

### Étape 4 : Créer l'AREA

```bash
POST /manager/bind
Authorization: Bearer <ton_jwt_token>
Content-Type: application/json

{
  "actionName": "notion_new_database_item",
  "actionConfig": {
    "databaseId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
  },
  "reactionName": "send_email",
  "reactionConfig": {
    "to": "ton-email@example.com",
    "subject": "🆕 Nouvelle tâche : {{NOTION_PROP_NAME}}",
    "body": "Une nouvelle tâche a été créée dans Notion !\n\n📝 Nom: {{NOTION_PROP_NAME}}\n📊 Statut: {{NOTION_PROP_STATUS}}\n👤 Assigné à: {{NOTION_PROP_ASSIGNÉ_À}}\n📅 Date d'échéance: {{NOTION_PROP_DATE_D_ÉCHÉANCE}}\n\n🔗 Voir dans Notion: {{NOTION_ITEM_URL}}\n\n⏰ Créé le: {{NOTION_ITEM_CREATED_TIME}}"
  }
}
```

**Réponse :**
```json
{
  "areaId": "12345678-1234-1234-1234-123456789abc",
  "message": "AREA created successfully"
}
```

## 💡 Exemples de cas d'usage

### Exemple 1 : Notification Discord pour nouvelles tâches

```json
{
  "actionName": "notion_new_database_item",
  "actionConfig": {
    "databaseId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
  },
  "reactionName": "discord_send_server_message",
  "reactionConfig": {
    "channelId": "123456789012345678",
    "message": "🆕 Nouvelle tâche créée : **{{NOTION_PROP_NAME}}**\nStatut : {{NOTION_PROP_STATUS}}\n{{NOTION_ITEM_URL}}"
  }
}
```

### Exemple 2 : Log simple des nouvelles entrées

```json
{
  "actionName": "notion_new_database_item",
  "actionConfig": {
    "databaseId": "f9e8d7c6-b5a4-4321-9876-543210fedcba"
  },
  "reactionName": "log_event",
  "reactionConfig": {}
}
```

### Exemple 3 : Email avec plusieurs propriétés

```json
{
  "actionName": "notion_new_database_item",
  "actionConfig": {
    "databaseId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
  },
  "reactionName": "send_email",
  "reactionConfig": {
    "to": "equipe@example.com",
    "subject": "Nouveau projet : {{NOTION_PROP_NAME}}",
    "body": "Bonjour,\n\nUn nouveau projet a été ajouté :\n\n📋 Nom du projet : {{NOTION_PROP_NAME}}\n💰 Budget : {{NOTION_PROP_BUDGET}}\n📊 Priorité : {{NOTION_PROP_PRIORITÉ}}\n👤 Chef de projet : {{NOTION_PROP_CHEF_DE_PROJET}}\n📅 Début prévu : {{NOTION_PROP_DATE_DE_DÉBUT}}\n\n🔗 Lien : {{NOTION_ITEM_URL}}\n\nCordialement,\nVotre système AREA"
  }
}
```

## 🎯 Comment ça fonctionne en interne

1. **Polling toutes les 10 secondes** (configurable via `NOTION_POLL_INTERVAL_MS`)
2. Le système interroge ta database Notion pour récupérer l'élément le plus récent
3. Il compare le `created_time` avec la valeur en cache Redis
4. **Si un nouvel élément est détecté** :
   - Toutes les propriétés sont extraites automatiquement
   - Les placeholders sont créés dynamiquement
   - La réaction est déclenchée avec toutes les données

## 🔄 Gérer tes AREAs

### Voir toutes tes AREAs actives

```bash
GET /manager/areas
Authorization: Bearer <ton_jwt_token>
```

### Désactiver une AREA

```bash
DELETE /manager/areas/{areaId}
Authorization: Bearer <ton_jwt_token>
```

## ⚙️ Configuration avancée

### Changer l'intervalle de polling

Dans le fichier `.env` :

```env
NOTION_POLL_INTERVAL_MS=5000  # Poll toutes les 5 secondes au lieu de 10
```

### Types de propriétés supportés

Tous les types de propriétés Notion sont automatiquement convertis en texte :
- **Title / Rich text** → Texte complet
- **Number** → Valeur numérique (string)
- **Select / Multi-select** → Option(s) sélectionnée(s)
- **Date** → Date ISO 8601
- **Checkbox** → "true" ou "false"
- **URL / Email / Phone** → Valeur brute
- **People** → Noms séparés par des virgules
- **Files** → Noms/URLs séparés par des virgules
- **Relation / Rollup / Formula** → Selon le type de résultat

## 🐛 Troubleshooting

### L'AREA ne se déclenche pas

1. Vérifie que ton compte Notion est bien lié : `GET /auth/notion/status`
2. Vérifie que l'intégration Notion a accès à la database
3. Regarde les logs du backend pour voir les erreurs éventuelles
4. Assure-toi que le `databaseId` est correct

### Les placeholders ne s'affichent pas

1. Vérifie l'orthographe exacte du placeholder
2. Utilise l'endpoint `/actions/notion/databases/:id/schema` pour voir les placeholders disponibles
3. Les noms de propriétés sont convertis : espaces → underscores, caractères spéciaux → supprimés

### "Notion account not linked"

```bash
# Relie ton compte Notion
GET /auth/notion/link
```

## 📚 Ressources

- Documentation complète : `/backend/src/modules/actions/notion/README.md`
- Tests unitaires : `/backend/test/actions/notion/database-item.service.spec.ts`
- Code source : `/backend/src/modules/actions/notion/`

