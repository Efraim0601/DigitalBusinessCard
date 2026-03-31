# Tests d’acceptation (UAT) — vcard app

Version: 1.0  
Date: 2026-03-25  
Projet: vcard app (carte de visite digitale)  
Objectif: valider l’acceptation **métier** avant mise en production

---

## 1. Objectifs UAT

- Valider que vcard répond aux besoins métier (création, gestion et diffusion de cartes de visite digitales).
- Valider la qualité perçue (simplicité, compréhension, cohérence FR/EN).
- Valider les parcours utilisateurs finaux (consultation, partage, QR, vCard).
- Détecter les points bloquants/irritants avant production.

---

## 2. Périmètre

### Inclus
- Connexion admin par email (sans mot de passe).
- Administration: Cartes / Directions / Titres-Postes (CRUD).
- Consultation publique d’une carte par lien `/?email=...`.
- Partage: lien, QR code, image (PNG), vCard.
- Bilingue FR/EN (interface + libellés FR/EN de référentiels).

### Exclu (non bloquant UAT si non demandé)
- Intégration SSO/AD (auth forte).
- Gestion avancée des rôles/permissions.
- Statistiques/reporting.

---

## 3. Rôles et participants

- **Testeurs Métier (UAT)**: RH / Communication / Utilisateurs représentatifs (commerciaux, support, managers).
- **Admin UAT**: 1 ou 2 personnes habilitées à créer/modifier les cartes.
- **Support IT/DSI**: assistance technique, logs, DB/migration.

---

## 4. Environnement & prérequis

### Environnement
- URL UAT: `https://<url-uat>` (à compléter)
- Navigateur recommandé: Chrome / Edge (desktop), Chrome Android, Safari iOS.

### Données & configuration
- Migration DB appliquée: tables `cards`, `departments`, `job_titles` présentes.
- Au moins:
  - 3 Directions FR/EN
  - 3 Titres/Postes FR/EN
  - 2 cartes de test (dont 1 “profil commercial” avec mobile/tel)
- Email admin UAT configuré: `<admin@domaine>` (à compléter)

### Matériel
- 1 smartphone (Android) + 1 iPhone (idéalement).
- Accès à une application Contacts pour importer un fichier `.vcf`.

---

## 5. Règles de validation

- **OK**: résultat conforme à l’attendu
- **KO**: non conforme (bloquant ou non)
- **NA**: non applicable (dans ce contexte)

### Criticité recommandée
- **Bloquant**: empêche l’usage (ex: création carte impossible, carte non consultable)
- **Majeur**: usage possible mais forte dégradation (ex: partage impossible)
- **Mineur**: irritant / ergonomie / libellé

---

## 6. Scénarios d’acceptation (pas-à-pas)

> Conseil: exécuter les scénarios 1 → 10 dans l’ordre.  
> Noter le résultat (OK/KO) + commentaires + capture si KO.

### Scénario 1 — Accès à l’application
- **Profil**: Tous
- **Étapes**:
  1. Ouvrir `https://<url-uat>/`
  2. Observer le chargement de la page
- **Attendu**:
  - La page se charge sans erreur
  - Aucun écran blanc / erreur serveur visible
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 2 — Connexion Admin (email autorisé)
- **Profil**: Admin UAT
- **Étapes**:
  1. Aller à la page de login admin
  2. Saisir l’email admin UAT
  3. Se connecter
- **Attendu**:
  - Accès à l’interface admin
  - Les onglets Admin sont visibles
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 3 — Connexion refusée (email non autorisé)
- **Profil**: Utilisateur non admin
- **Étapes**:
  1. Aller à la page de login admin
  2. Saisir un email non autorisé
  3. Se connecter
- **Attendu**:
  - Accès refusé, message clair
  - Aucun accès aux écrans admin
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 4 — Création d’une Direction (FR/EN)
- **Profil**: Admin UAT
- **Étapes**:
  1. Admin → onglet **Directions**
  2. Cliquer **Ajouter**
  3. Saisir `label_fr` et `label_en`
  4. Enregistrer
- **Attendu**:
  - La direction apparaît dans la liste
  - Les champs FR/EN sont sauvegardés
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 5 — Création d’un Titre/Poste (FR/EN)
- **Profil**: Admin UAT
- **Étapes**:
  1. Admin → onglet **Titres/Postes**
  2. Cliquer **Ajouter**
  3. Saisir `label_fr` et `label_en`
  4. Enregistrer
- **Attendu**:
  - Le titre/poste apparaît dans la liste
  - Les champs FR/EN sont sauvegardés
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 6 — Création d’une carte (avec sélection Direction/Titre)
- **Profil**: Admin UAT
- **Étapes**:
  1. Admin → onglet **Cartes** → **Créer une carte**
  2. Saisir email, nom, prénom, tel, mobile
  3. Sélectionner une **Direction** (liste)
  4. Sélectionner un **Titre/Poste** (liste)
  5. Enregistrer
- **Attendu**:
  - La carte apparaît dans la liste
  - La direction et le titre affichés sont corrects
  - Pas d’option “Autre / saisie libre” dans les listes
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 7 — Modification d’une carte
- **Profil**: Admin UAT
- **Étapes**:
  1. Cliquer sur une carte existante
  2. Modifier un champ (ex: mobile)
  3. Enregistrer
- **Attendu**:
  - Les modifications sont persistées
  - Le nouveau mobile apparaît à la consultation
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 8 — Consultation publique d’une carte par email
- **Profil**: Utilisateur final
- **Étapes**:
  1. Ouvrir l’URL `https://<url-uat>/?email=<email_carte_test>`
  2. Attendre l’affichage
- **Attendu**:
  - La carte s’affiche
  - Les informations sont lisibles sur mobile
  - Ordre des numéros: **Tél → Fax → Mob**
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 9 — Partage (lien + QR)
- **Profil**: Utilisateur final (mobile idéalement)
- **Étapes**:
  1. Sur la carte, ouvrir **Partager**
  2. Tester **Partager le lien**
  3. Tester **Partager le QR code**
- **Attendu**:
  - Partage natif si disponible (sinon fallback copie/téléchargement)
  - Le QR code ouvre bien la carte (même email)
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 10 — Export carte en image (PNG)
- **Profil**: Utilisateur final
- **Étapes**:
  1. Sur la carte, cliquer **Télécharger la carte**
  2. Vérifier le fichier PNG généré
- **Attendu**:
  - Le PNG est généré sans erreur
  - Le visuel est complet (fond, texte lisible)
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 11 — vCard (enregistrer le contact)
- **Profil**: Utilisateur final (mobile)
- **Étapes**:
  1. Ouvrir le popover QR
  2. Cliquer **Enregistrer le contact**
  3. Importer le `.vcf` dans Contacts
- **Attendu**:
  - Le fichier `.vcf` est téléchargé
  - Le contact est importé correctement (nom + téléphone/email)
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 12 — FR/EN sur la carte (libellés référentiels)
- **Profil**: Utilisateur final
- **Étapes**:
  1. Passer la langue en **EN**
  2. Recharger la carte `/?email=<email_carte_test>`
  3. Observer le libellé Direction et Titre/Poste
- **Attendu**:
  - Direction/titre affichés en **anglais** si référentiel présent (label_en)
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

### Scénario 13 — Gestion erreurs (carte inexistante)
- **Profil**: Utilisateur final
- **Étapes**:
  1. Ouvrir `/?email=unknown@example.com`
- **Attendu**:
  - Message clair “carte introuvable” (pas d’erreur technique)
- **Résultat**: ☐ OK ☐ KO ☐ NA  
- **Commentaires**:

---

## 7. Checklist finale d’acceptation

- ☐ Les parcours admin (CRUD cartes/directions/titres) sont validés
- ☐ La consultation carte est validée (desktop + mobile)
- ☐ Le partage lien/QR est validé (au moins 1 mobile)
- ☐ Le téléchargement PNG est validé
- ☐ La vCard est validée (import contact)
- ☐ FR/EN validé (au minimum sur un parcours)
- ☐ Aucun incident bloquant restant

---

## 8. Synthèse & décision

### Bilan des KO (si applicable)
- KO #1: … (bloquant/majeur/mineur) — action: …
- KO #2: …

### Décision
- ☐ VALIDATION
- ☐ VALIDATION SOUS RÉSERVE
- ☐ REJET

Commentaires:

---

## 9. Signatures

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Métier (UAT) |  |  |  |
| Admin UAT |  |  |  |
| DSI/IT |  |  |  |

