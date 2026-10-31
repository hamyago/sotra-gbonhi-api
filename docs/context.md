# CONTEXT.MD — SÉCURITÉ DU PROJET SOTRA GBONHI

> Document de référence pour toute question relative à la sécurité de la plateforme SOTRA GBONHI.
> Dernière mise à jour : 19 octobre 2026
> Version : 1.0
> Statut : **Phase de développement avancée** (backend en production test)

---

## 1. VUE D'ENSEMBLE DU PROJET

**SOTRA GBONHI** est une plateforme numérique de mobilité et services événementiels (transport collectif, parkings, billetterie) dans le District d'Abidjan, Côte d'Ivoire.

### 1.1 Stack technique

| Composant | Technologie | Version |
|---|---|---|
| **Backend** | NestJS (Node.js) | 11.2.7 |
| **Langage** | TypeScript | 5.3.3 |
| **Base de données** | PostgreSQL | 16 |
| **Cache / Sessions** | Redis | 7 |
| **Mobile** | Flutter | 3.x |
| **Reverse Proxy** | Nginx | 1.24 |
| **SSL** | Let's Encrypt (Certbot) | Auto-renew |
| **Conteneurisation** | Docker + Docker Compose | Latest |
| **Hébergement** | VPS Contabo (75.119.138.112) | Ubuntu 24.04 LTS |

### 1.2 Environnements

| Env | URL | Statut |
|---|---|---|
| **Production (test)** | `https://api.sotra.oyop-mt.com` | Actif |
| **Local (dev)** | `http://localhost:3002` | Actif |
| **Base de données** | PostgreSQL port `5440` (localhost uniquement) | Actif |

---

## 2. ARCHITECTURE RÉSEAU ET SÉCURITÉ

### 2.1 Isolation Docker

(Voir schéma dans le document original)

### 2.2 Ports exposés

| Port | Service | Exposition | Sécurité |
|---|---|---|---|
| **22** | SSH | Public | ⚠️ Mot de passe root à désactiver (clé SSH uniquement) |
| **80** | Nginx (HTTP) | Public | ✅ Redirection 301 → HTTPS |
| **443** | Nginx (HTTPS) | Public | ✅ TLS 1.3 |
| **3002** | API NestJS | `127.0.0.1` uniquement | ✅ Non exposé publiquement |
| **5440** | PostgreSQL | `127.0.0.1` uniquement | ✅ Non exposé publiquement |
| **6381** | Redis | `127.0.0.1` uniquement | ✅ Non exposé publiquement |

### 2.3 Isolation par rapport aux autres projets

Le VPS héberge d'autres applications (`vigiroutes`, `trangix`, `medi-carte`, `dobok`, `oyop-mt`). SOTRA GBONHI est isolé via :
- Réseau Docker dédié (`sotra-network`)
- Ports dédiés (5440, 6381, 3002)
- Volumes Docker dédiés
- Sous-domaine dédié (`api.sotra.oyop-mt.com`)

---

## 3. AUTHENTIFICATION ET AUTORISATION

### 3.1 Flux d'authentification (OTP + JWT)

Le flux est le suivant : Le client demande un OTP, l'API génère et envoie l'OTP par SMS. Le client valide l'OTP et reçoit un AccessToken et RefreshToken.

### 3.2 Tokens JWT

| Token | Durée de vie | Algorithme | Secret |
|---|---|---|---|
| **Access Token** | 15 min (24h en dev) | HS256 | `JWT_SECRET` |
| **Refresh Token** | 30 jours | HS256 | `JWT_REFRESH_SECRET` |

### 3.3 Rôles utilisateur

- **CUSTOMER** : Client final
- **DRIVER** : Chauffeur de bus
- **AGENT** : Agent de scan
- **ADMIN** : Administrateur

### 3.4 Protection des endpoints

| Endpoint | Authentification | Rôle requis |
|---|---|---|
| `POST /auth/register` | ❌ Public | - |
| `POST /auth/verify-otp` | ❌ Public | - |
| `GET /auth/me` | ✅ JWT | CUSTOMER |
| `GET /events` | ❌ Public | - |
| `POST /events` | ⚠️ Non protégé (TODO) | ADMIN |
| `POST /orders` | ✅ JWT | CUSTOMER |
| `POST /orders/:id/mark-paid` | ⚠️ Non protégé (TODO) | Système/Webhook |
| `GET /tickets` | ✅ JWT | CUSTOMER |
| `POST /tickets/:id/share` | ✅ JWT | CUSTOMER |
| `GET /tickets/verify` | ❌ Public (agents) | - |

---

## 4. PROTECTION DES DONNÉES

### 4.1 Données personnelles collectées

- Numéro de téléphone (obligatoire, 3 ans)
- Nom complet (optionnel)
- Email (optionnel)
- Historique commandes (10 ans, fiscal)
- Tokens JWT (15 min / 30 jours)
- OTP hashé (5 minutes)

### 4.2 Chiffrement

- **OTP** : bcrypt (10 rounds)
- **JWT** : HMAC-SHA256
- **QR code** : HMAC-SHA256
- **Transport** : TLS 1.3 (HTTPS)

---

## 5. SÉCURITÉ DES PAIEMENTS

### 5.1 Réglementation BCEAO (CRITIQUE)

⚠️ **La Côte d'Ivoire est sous la réglementation de la BCEAO**.
**Interdiction** : Détenir des fonds pour autrui (wallet interne) sans agrément **Établissement de Paiement**.
**Conséquence** : Le projet **ne doit PAS** implémenter de wallet interne. Chaque paiement doit passer par un agrégateur agréé (CinetPay, PayDunya, DigitalPay, etc.).

### 5.2 Sécurité des paiements

- Ne jamais stocker de carte bancaire (délégué à l'agrégateur)
- Vérification côté serveur de chaque paiement via Webhook
- Idempotence des transactions (éviter les doubles débits)

### 5.3 Actuellement (phase de test)

⚠️ L'endpoint `POST /orders/:id/mark-paid` est **public** et permet à n'importe qui de marquer une commande comme payée. C'est **volontaire** pour les tests, mais **À SUPPRIMER** en production.

---

## 6. SÉCURITÉ DES QR CODES

### 6.1 Format

`TKT.<ticket_uuid>.<timestamp>.<signature_hmac_16>`

### 6.2 Vérification

1. Vérifier la signature HMAC (rejette les QR falsifiés)
2. Vérifier que le ticket existe en base
3. Vérifier que le ticket est `VALID` (pas `USED`)
4. Vérifier que la commande est `PAID`

### 6.3 Protection contre le rejeu

⚠️ **Vulnérabilité actuelle** : un QR peut être scanné plusieurs fois.
**Actions à faire** : Mettre à jour `status = USED` après le premier scan.

---

## 7. VULNÉRABILITÉS CONNUES

### 7.1 Corrigées ✅
- Bug TypeScript 6 (décorateurs non émis) -> Downgrade TS 5.3.3
- Cache TypeScript dist/ vide -> `rm -rf dist/ *.tsbuildinfo`
- `orderId` null -> SQL brut et casts `::enum_type`

### 7.2 Ouvertes ⚠️
- **Rate limiting absent** (Brute force OTP)
- **`/orders/:id/mark-paid` public** (Paiement gratuit)
- **`POST /events` non protégé**
- **Scan QR rejouable** (Non marqué USED)
- **Pas de CORS strict**
- **Container root**

---

## 8. CHECKLIST AVANT PRODUCTION

- [ ] Supprimer `POST /orders/:id/mark-paid`
- [ ] Créer `POST /webhooks/payment` avec signature HMAC
- [ ] Protéger `POST /events` (ADMIN)
- [ ] Ajouter rate limiting sur `/auth/*`
- [ ] Ajouter CORS strict
- [ ] Bloquer le rejeu des QR
- [ ] Désactiver mot de passe root SSH
- [ ] Changer tous les secrets (JWT, QR, DB)
- [ ] Ajouter Helmet, Compression, Swagger
- [ ] Configurer monitoring (Sentry, UptimeRobot)

---

**FIN DU DOCUMENT**
