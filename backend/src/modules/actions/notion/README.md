# Notion Database Item Action

## Description

Cette action surveille une database Notion et déclenche une réaction lorsqu'un nouvel élément est ajouté à la database.

## Fonctionnalités

- **Polling automatique** : Vérifie périodiquement les nouvelles entrées dans la database
- **Placeholders dynamiques** : Extrait automatiquement toutes les propriétés de la database
- **Support de tous les types de propriétés Notion** : title, rich_text, number, select, multi_select, date, checkbox, url, email, phone_number, status, people, files, relation, formula, rollup

## Configuration

### Variables d'environnement

- `NOTION_POLL_INTERVAL_MS` : Intervalle de polling en millisecondes (par défaut : 10000)

### Paramètres de l'action

- `databaseId` (required) : L'ID de la database Notion à surveiller

## Endpoints API

### GET /actions/notion/databases

Liste toutes les databases accessibles dans le workspace Notion lié de l'utilisateur.

**Response:**
```json
{
  "databases": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "My Database",
      "url": "https://www.notion.so/123e4567e89b12d3a456426614174000",
      "created_time": "2023-12-10T15:30:00.000Z",
      "last_edited_time": "2023-12-10T15:35:00.000Z"
    }
  ]
}
```

### GET /actions/notion/databases/:databaseId/schema

Récupère le schéma d'une database spécifique pour voir les placeholders disponibles.

**Response:**
```json
{
  "databaseId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My Database",
  "url": "https://www.notion.so/123e4567e89b12d3a456426614174000",
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
    }
  ],
  "baseProperties": [
    { "key": "NOTION_ITEM_ID", "description": "The unique ID of the database item" },
    { "key": "NOTION_ITEM_URL", "description": "The URL to view the item in Notion" },
    { "key": "NOTION_ITEM_CREATED_TIME", "description": "When the item was created (ISO 8601 format)" },
    { "key": "NOTION_ITEM_LAST_EDITED_TIME", "description": "When the item was last edited (ISO 8601 format)" },
    { "key": "NOTION_DATABASE_ID", "description": "The ID of the database containing the item" }
  ]
}
```

## Placeholders disponibles

### Placeholders de base

- `NOTION_ITEM_ID` : L'ID unique de l'élément
- `NOTION_ITEM_URL` : L'URL pour voir l'élément dans Notion
- `NOTION_ITEM_CREATED_TIME` : Quand l'élément a été créé (format ISO 8601)
- `NOTION_ITEM_LAST_EDITED_TIME` : Quand l'élément a été édité pour la dernière fois (format ISO 8601)
- `NOTION_DATABASE_ID` : L'ID de la database contenant l'élément

### Placeholders dynamiques

Les propriétés de la database sont automatiquement converties en placeholders :

- Format : `NOTION_PROP_<NOM_PROPRIETE>`
- Le nom est converti en majuscules et les caractères spéciaux sont remplacés par des underscores
- Exemples :
  - Propriété "Name" → `NOTION_PROP_NAME`
  - Propriété "Due Date" → `NOTION_PROP_DUE_DATE`
  - Propriété "Assigné à" → `NOTION_PROP_ASSIGNÉ_À` (conserve les caractères spéciaux compatibles)

### Types de propriétés supportés

| Type Notion | Valeur extraite |
|------------|-----------------|
| title | Texte complet |
| rich_text | Texte complet |
| number | Valeur numérique (string) |
| select | Nom de l'option sélectionnée |
| multi_select | Noms des options séparés par des virgules |
| date | Date de début (ISO 8601) |
| checkbox | "true" ou "false" |
| url | URL complète |
| email | Adresse email |
| phone_number | Numéro de téléphone |
| status | Nom du statut |
| people | Noms des personnes séparés par des virgules |
| files | Noms/URLs des fichiers séparés par des virgules |
| relation | IDs des relations séparés par des virgules |
| formula | Résultat de la formule (selon le type) |
| rollup | Valeur agrégée (selon le type) |

## Exemple d'utilisation

### 1. Lier votre compte Notion

```bash
GET /auth/notion/link
```

### 2. Récupérer les databases disponibles

```bash
GET /actions/notion/databases
```

### 3. Créer une AREA

```json
{
  "actionName": "notion_new_database_item",
  "actionConfig": {
    "databaseId": "123e4567-e89b-12d3-a456-426614174000"
  },
  "reactionName": "send_email",
  "reactionConfig": {
    "to": "user@example.com",
    "subject": "Nouvelle tâche dans Notion: {{NOTION_PROP_NAME}}",
    "body": "Une nouvelle tâche a été créée:\n\nNom: {{NOTION_PROP_NAME}}\nStatut: {{NOTION_PROP_STATUS}}\nURL: {{NOTION_ITEM_URL}}\nCréé le: {{NOTION_ITEM_CREATED_TIME}}"
  }
}
```

## Architecture

### Composants

1. **NotionDatabaseItemService** : Service de polling qui surveille les databases Notion
2. **NotionActionsController** : Controller exposant les endpoints pour configurer l'action
3. **NotionActionsModule** : Module NestJS regroupant les composants Notion

### Stratégie de détection

1. **Polling périodique** : Requête à intervalle régulier vers l'API Notion
2. **Tri par created_time** : Récupère l'élément le plus récent de la database
3. **Comparaison avec cache Redis** : Compare le `created_time` avec la valeur en cache
4. **Déclenchement** : Si un nouvel élément est détecté, déclenche la réaction avec toutes les données

### Cache Redis

- Clé : `notion:last_item_created_time:${userId}:${databaseId}`
- Valeur : ISO 8601 timestamp du dernier élément vu
- Permet de suivre l'état pour chaque utilisateur et database

## Tests

Exécuter les tests unitaires :

```bash
npm test -- database-item.service.spec.ts
```

## Notes importantes

1. **Permissions Notion** : L'intégration Notion doit avoir accès à la database à surveiller
2. **Baseline initialization** : Le premier élément détecté ne déclenche pas de réaction (initialisation du cache)
3. **Database vide** : Une database vide ne déclenche pas de réaction
4. **Rate limiting** : Respecte les limites de l'API Notion (configurez `NOTION_POLL_INTERVAL_MS` en conséquence)

## Intégration avec le frontend

Le frontend peut :
1. Lister les databases disponibles via `GET /actions/notion/databases`
2. Afficher le schéma d'une database via `GET /actions/notion/databases/:id/schema`
3. Présenter les placeholders disponibles à l'utilisateur lors de la configuration de la réaction
4. Permettre l'autocomplétion des placeholders dans les champs de configuration

