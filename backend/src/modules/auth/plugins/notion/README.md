# Notion OAuth Integration

Ce guide explique comment configurer l'authentification Notion pour une application IFTTT-like.

## Architecture Notion pour IFTTT

**Cette implémentation utilise un Bot Token (workspace-level)** :

### Bot Token (workspace-level)
- 🎯 **Usage**: ACTIONS et REACTIONS - Lire et écrire dans Notion
- ✅ Accès aux pages partagées avec l'intégration
- ✅ Ne expire jamais
- ✅ Idéal pour créer des pages, databases, et lire du contenu
- 📍 Token `secret_...`

### Exemple de workflow IFTTT
```
IF: Nouveau email reçu (Gmail)
THEN: Crée une page dans Notion avec le contenu de l'email

IF: Nouvelle tâche dans une database Notion
THEN: Envoie une notification Slack
```

## Table des matières

1. [Création de l'intégration Notion](#création-de-lintégration-notion)
2. [Configuration OAuth](#configuration-oauth)
3. [Variables d'environnement](#variables-denvironnement)
4. [Capacités disponibles](#capacités-disponibles)
5. [Test de l'intégration](#test-de-lintégration)

---

## Création de l'intégration Notion

### 1. Créer une intégration Notion

1. Accédez à [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Cliquez sur **"+ New integration"**
3. Donnez un nom à votre intégration (ex: "AREA Bot")
4. Sélectionnez le workspace associé
5. Configurez les capacités (voir section ci-dessous)
6. Cliquez sur **"Submit"**

### 2. Récupérer les credentials

Dans la page de votre intégration :

1. **Onglet "Secrets"** :
   - Notez le **OAuth client ID** → Utilisez-le pour `NOTION_CLIENT_ID`
   - Notez le **OAuth client secret** → Utilisez-le pour `NOTION_CLIENT_SECRET`

2. **Onglet "Distribution"** (pour OAuth public) :
   - Activez **"Public integration"** si vous voulez que d'autres utilisateurs puissent s'y connecter
   - Sinon, restez en mode "Internal integration" pour tester

Ces credentials sont nécessaires pour l'intégration OAuth.

---

## Configuration OAuth

### 1. Configurer les Redirect URLs

Dans l'onglet **"Distribution"** > **"Redirect URIs"**:

1. Cliquez sur **"Add redirect URI"**
2. Ajoutez votre URL de callback selon votre environnement:

   **Pour le développement local**:
   ```
   http://localhost:3000/auth/notion/callback
   ```

   **Pour le développement avec ngrok** (recommandé pour tester):
   ```
   https://your-subdomain.ngrok-free.app/auth/notion/callback
   ```

   **Pour la production**:
   ```
   https://votre-domaine.com/auth/notion/callback
   ```

3. Cliquez sur **"Add URI"**

💡 **Astuce ngrok**: Pour tester OAuth en développement, utilisez ngrok pour exposer votre backend local :
```bash
ngrok http 3000
```
Puis utilisez l'URL HTTPS fournie comme redirect URI.

### 2. Configurer les Capabilities

Dans l'onglet **"Capabilities"**, activez les permissions dont vous avez besoin :

#### Content Capabilities (Contenu)
- ✅ **Read content** - Lire les pages et databases
- ✅ **Update content** - Modifier le contenu existant
- ✅ **Insert content** - Créer de nouvelles pages et blocs

#### User Capabilities (Utilisateurs)
- ✅ **Read user information without email** - Lire les infos basiques des utilisateurs
- ⬜ **Read user information with email** - Lire les emails (optionnel)

#### Comment Capabilities (Commentaires)
- ⬜ **Read comments** - Lire les commentaires (optionnel)
- ⬜ **Create comments** - Créer des commentaires (optionnel)

**Note**: Contrairement à d'autres OAuth providers, Notion n'utilise pas de "scopes" dans l'URL d'autorisation. Les permissions sont configurées au niveau de l'intégration et l'utilisateur accepte toutes les permissions lors de la connexion.

### 3. Distribution (Rendre l'intégration publique)

Si vous voulez que n'importe quel utilisateur Notion puisse connecter votre app :

1. Allez dans **"Distribution"**
2. Activez **"Make integration public"**
3. Remplissez les informations requises :
   - Description de l'intégration
   - Logo (optionnel)
   - Lien vers la politique de confidentialité
   - Lien vers les conditions d'utilisation
4. Soumettez pour révision si nécessaire

⚠️ **Pour le développement**, restez en mode "Internal" jusqu'à ce que tout fonctionne.

---

## Variables d'environnement

Ajoutez les variables suivantes à votre fichier `.env`:

```env
# Notion OAuth Configuration
NOTION_CLIENT_ID=your_client_id_here
NOTION_CLIENT_SECRET=your_client_secret_here
NOTION_REDIRECT_URI=http://localhost:3000/auth/notion/callback
```

### Configuration selon l'environnement

**Développement local** (port par défaut 3000):
```env
NOTION_REDIRECT_URI=http://localhost:3000/auth/notion/callback
```

**Développement avec ngrok** (pour tester avec Notion):
```env
NOTION_REDIRECT_URI=https://your-subdomain.ngrok-free.app/auth/notion/callback
```

**Production**:
```env
NOTION_REDIRECT_URI=https://votre-domaine.com/auth/notion/callback
```

⚠️ **Important**: La `NOTION_REDIRECT_URI` doit **exactement** correspondre à celle configurée dans votre intégration Notion (section "Distribution" > "Redirect URIs").

---

## Capacités disponibles

### Opérations sur les pages

| Opération              | Description                                       |
|------------------------|---------------------------------------------------|
| Lire une page          | Récupérer le contenu et les propriétés d'une page |
| Créer une page         | Créer une nouvelle page dans Notion               |
| Mettre à jour une page | Modifier les propriétés d'une page existante      |
| Archiver une page      | Archiver une page                                 |

### Opérations sur les databases

| Opération                | Description                                             |
|--------------------------|---------------------------------------------------------|
| Lire une database        | Récupérer les propriétés et la structure d'une database |
| Requêter une database    | Rechercher et filtrer des entrées dans une database     |
| Créer une entrée         | Ajouter une nouvelle ligne dans une database            |
| Mettre à jour une entrée | Modifier une entrée existante                           |

### Opérations sur les blocs

| Opération              | Description                                      |
|------------------------|--------------------------------------------------|
| Lire les blocs enfants | Récupérer les blocs de contenu d'une page        |
| Ajouter des blocs      | Insérer du nouveau contenu (texte, images, etc.) |
| Mettre à jour un bloc  | Modifier un bloc existant                        |
| Supprimer un bloc      | Supprimer un bloc                                |

### Opérations sur les utilisateurs

| Opération               | Description                                    |
|-------------------------|------------------------------------------------|
| Lire un utilisateur     | Récupérer les infos d'un utilisateur           |
| Lister les utilisateurs | Obtenir la liste des utilisateurs du workspace |

---

## Spécificités de l'API Notion

### Version de l'API

Notion utilise un système de versioning par date. Ajoutez toujours le header suivant dans vos requêtes :

```
Notion-Version: 2022-06-28
```

### Format d'authentification

L'authentification OAuth de Notion utilise :
- **Basic Auth** pour l'échange du code (format `clientId:clientSecret` en base64)
- **Bearer Token** pour les requêtes API (`Authorization: Bearer <access_token>`)

### Tokens qui n'expirent pas

**Particularité importante** : Les access tokens Notion n'expirent jamais et il n'y a pas de refresh token. Une fois obtenu, le token reste valide jusqu'à ce que :
- L'utilisateur révoque l'accès manuellement
- L'intégration soit supprimée
- L'intégration soit retirée du workspace

### Partage des pages

Pour qu'une intégration puisse accéder à une page ou database Notion, **l'utilisateur doit explicitement partager la page avec l'intégration**. Cela se fait via :
1. Le menu "..." en haut à droite d'une page
2. "Add connections"
3. Sélectionner votre intégration

Sans ce partage, l'API retournera une erreur 404 même si le token est valide.

---

## Test de l'intégration

### 1. Démarrer le backend

```bash
cd backend
npm run start:dev
```

### 2. Tester la connexion

**Via l'interface frontend** :
1. Accédez à la page de connexion
2. Cliquez sur "Connect with Notion"
3. Autorisez l'accès dans Notion
4. Vous serez redirigé vers votre application

**Via API directe** :
```bash
# 1. Obtenir l'URL de consentement
curl http://localhost:3000/auth/notion/link?userId=your-user-id

# 2. Ouvrir l'URL dans un navigateur et autoriser
# 3. Le callback sera traité automatiquement
```

### 3. Vérifier le lien

**Via l'API** :
```bash
# Vérifier que le compte est bien lié
curl -H "Authorization: Bearer <your-jwt>" \
  http://localhost:3000/auth/linked-accounts
```

**Dans la base de données** :
```sql
SELECT * FROM linked_accounts WHERE provider = 'notion' AND user_id = 'your-user-id';
```

### 4. Tester une requête API Notion

Une fois lié, testez une requête simple :

```typescript
// Exemple : Lister les pages accessibles
const accessToken = await notionLinking.getCurrentAccessToken(userId);

const response = await fetch('https://api.notion.com/v1/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    filter: { property: 'object', value: 'page' }
  })
});

const data = await response.json();
console.log('Pages accessibles:', data.results);
```

---

## Débogage

### Erreur : "Invalid client_id or redirect_uri"

**Cause** : Le client ID ou le redirect URI ne correspond pas à la configuration de votre intégration.

**Solution** :
1. Vérifiez que `NOTION_CLIENT_ID` correspond bien au OAuth client ID de votre intégration
2. Vérifiez que `NOTION_REDIRECT_URI` est exactement le même que celui configuré dans "Distribution" > "Redirect URIs"
3. Attention aux trailing slashes et au protocole (http vs https)

### Erreur : "Unauthorized" ou 401

**Cause** : Le token n'est pas valide ou a été révoqué.

**Solution** :
1. Vérifiez que le token est bien stocké et chiffré correctement
2. Demandez à l'utilisateur de se reconnecter
3. Vérifiez que l'intégration n'a pas été retirée du workspace

### Erreur : "Object not found" ou 404

**Causes possibles** :
1. La page/database n'existe pas
2. **L'intégration n'a pas accès à cette page** (cause la plus fréquente)

**Solution** :
1. Vérifiez que la page est bien partagée avec votre intégration
2. Dans Notion, ouvrez la page → "..." → "Add connections" → Sélectionnez votre intégration
3. Testez avec une page de test que vous avez explicitement partagée

### Le token ne fonctionne plus

**Cause** : L'utilisateur a révoqué l'accès ou l'intégration a été retirée.

**Solution** :
1. Vérifiez dans [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Demandez à l'utilisateur de se reconnecter
3. Implémentez une gestion d'erreur qui détecte les 401 et demande une reconnexion

---

## Ressources officielles

- 📖 [Documentation officielle Notion API](https://developers.notion.com/)
- 🔐 [Guide OAuth Notion](https://developers.notion.com/docs/authorization)
- 🎯 [Référence API complète](https://developers.notion.com/reference/intro)
- 💬 [Forum développeurs Notion](https://community.notion.so/)
- 🛠️ [SDK JavaScript officiel](https://github.com/makenotion/notion-sdk-js)

---

## Notes pour les développeurs

### Différences avec d'autres OAuth providers

1. **Pas de scopes** : Les permissions sont définies au niveau de l'intégration, pas dans l'URL OAuth
2. **Basic Auth** : L'échange de code utilise Basic Auth au lieu de form-urlencoded
3. **Tokens permanents** : Pas d'expiration, pas de refresh token
4. **Partage explicite** : Les utilisateurs doivent manuellement partager chaque page avec l'intégration
5. **API versionnée par date** : Toujours inclure le header `Notion-Version`

### Bonnes pratiques

1. **Gestion d'erreurs robuste** : Toujours vérifier les 401/404 et guider l'utilisateur
2. **Rate limiting** : Notion limite à 3 requêtes par seconde (respectez les headers `Retry-After`)
3. **Pagination** : Utilisez le paramètre `start_cursor` pour les listes longues
4. **Cache** : Les tokens ne changeant jamais, vous pouvez les cacher longtemps
5. **Validation** : Testez régulièrement que les tokens fonctionnent encore

### Sécurité

- ✅ Les tokens sont chiffrés avant d'être stockés en base de données
- ✅ Le state JWT expire après 10 minutes pour éviter les attaques CSRF
- ✅ Utilisez toujours HTTPS en production
- ✅ Ne loggez jamais les access tokens en clair
- ✅ Implémentez un système de révocation des tokens si nécessaire

