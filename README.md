# 🧠 Obsidian MCP Cloudflare

Ce projet implémente un **serveur MCP (Model Context Protocol)** 100 % hébergé sur **Cloudflare Workers**,  
capable d’interagir avec un **vault Obsidian stocké sur Storj (EU1)** via l’API S3-compatible.

Il expose trois endpoints compatibles avec ChatGPT Team :

- `GET /listNotes` → liste les fichiers `.md` dans le bucket Storj  
- `POST /readNote` → lit une note markdown  
- `POST /writeNote` → écrit ou met à jour une note markdown  

Tout le code tourne sur Cloudflare (pas de backend Python, pas de base externe).

---

## 🚀 Architecture

ChatGPT ↔️ Cloudflare Worker (MCP API)
↕
Storj (S3 Gateway EU1)
↕
Fichiers Obsidian

yaml
Copier le code

Le Worker JS agit comme passerelle HTTP : il parle S3 en HTTPS et renvoie des objets JSON compréhensibles par ChatGPT.

---

## 📁 Structure du projet

obsidian-mcp-cloudflare/
├── src/
│ └── index.js # Code principal du Worker
├── wrangler.toml # Configuration Cloudflare Workers
├── package.json # Dépendances & scripts npm
├── .env.example # Modèle de configuration locale (non commité)
└── .github/
└── workflows/
└── deploy.yml # Déploiement automatique GitHub → Cloudflare

yaml
Copier le code

---

## ⚙️ Configuration requise

### Prérequis
- Un compte **Cloudflare** (avec Workers activé)
- Un bucket **Storj** configuré dans la région **EU1**
- Un accès GitHub (pour le déploiement CI/CD)

---

## 🧩 Variables d’environnement

Les variables sensibles sont injectées via **GitHub Secrets** ou via le tableau de bord Cloudflare.

| Nom | Exemple | Description |
|------|----------|-------------|
| `STORJ_ENDPOINT` | `https://gateway.eu1.storjshare.io` | Endpoint S3 régional Storj |
| `STORJ_BUCKET` | `obsidian-vault` | Nom du bucket |
| `STORJ_PREFIX` | `notes` | Sous-dossier contenant les notes |
| `STORJ_ACCESS_KEY` | `1YXXJ2ZKXXXX` | Access Key Storj |
| `STORJ_SECRET_KEY` | `wZr3ZXXXX` | Secret Key Storj |
| `CLOUDFLARE_ACCOUNT_ID` | `1234567890abcdef...` | ID de compte Cloudflare |
| `CLOUDFLARE_API_TOKEN` | `eyJh...` | Token API (permission “Workers Writes”) |

---

## 🧠 Installation locale

```bash
git clone https://github.com/<ton_user>/obsidian-mcp-cloudflare.git
cd obsidian-mcp-cloudflare
npm install
npm test
cp .env.example .env
# renseigne tes clés Storj dans .env
npx wrangler dev
➡️ Ton Worker tourne alors localement sur :
http://localhost:8787

Test rapide
bash
Copier le code
curl http://localhost:8787/listNotes
☁️ Déploiement automatique (CI/CD)
Le déploiement s’effectue via GitHub Actions dès qu’un commit est poussé sur main. Un workflow dédié exécute d’abord la suite de tests unitaires (`npm test`), puis déclenche la publication si tout est vert.

Fichier .github/workflows/deploy.yml
Le workflow :

Installe Wrangler (CLI Cloudflare)

Injecte tes secrets Storj & Cloudflare

Publie ton Worker sur ton compte Cloudflare

Secrets GitHub à configurer
Dans ton repo GitHub :
Settings → Secrets and variables → Actions → New repository secret

Ajoute :

Nom	Exemple
CLOUDFLARE_API_TOKEN	eyJh...
CLOUDFLARE_ACCOUNT_ID	1234567890abcdef...
STORJ_ENDPOINT	https://gateway.eu1.storjshare.io
STORJ_BUCKET	obsidian-vault
STORJ_PREFIX	notes
STORJ_ACCESS_KEY	1YXXJ2ZKXXXX
STORJ_SECRET_KEY	wZr3ZXXXX

🌍 Déploiement manuel (optionnel)
Si tu veux déployer manuellement depuis ton terminal :

bash
Copier le code
npx wrangler deploy
Wrangler publiera automatiquement ton Worker sur :

arduino
Copier le code
https://obsidian-mcp.<ton-sous-domaine>.workers.dev
🔌 Connexion à ChatGPT (MCP)
Ouvre ChatGPT (version Team ou supérieure)

Va dans Settings → Developer → Model Context Protocol (MCP)

Clique sur Add endpoint

Renseigne :

Name : Obsidian MCP

Endpoint URL : https://obsidian-mcp.<ton-sous-domaine>.workers.dev

Methods :

listNotes

readNote

writeNote

Si ton Worker est privé, ajoute un header :

makefile
Copier le code
Authorization: Bearer <ton_token_optionnel>
Tu peux alors demander à ChatGPT :

“Liste mes notes Obsidian”
“Lis le contenu de la note meeting_2025.md”
“Écris une nouvelle note intitulée projet_IA.md avec le texte suivant…”

🔍 Debug & logs
Pour suivre les logs du Worker :

bash
Copier le code
npx wrangler tail
ou via l’interface Cloudflare → Workers → ton Worker → Logs.

🧩 Stack technique
Cloudflare Workers — exécution du code JS sans serveur

Storj Gateway S3 (EU1) — stockage des notes Markdown

Wrangler 3.x — outil de build et déploiement Cloudflare

GitHub Actions — CI/CD automatisé

🧭 Licence
Projet libre pour usage personnel et éducatif.
Auteur : Suan Tay (IAfluence)
Année : 2025
