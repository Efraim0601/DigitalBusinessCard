# FICHE DE TEST - vcard app

## I. Caracteristiques du projet

- **Reference de la demande**: [A completer]
- **Logiciel - version**: vcard app - 1.0
- **Ressource developpeurs**: [A completer]
- **Responsable Recette**: [A completer]

---

## II. Presentation du projet

L'objectif de l'application **vcard app** est de permettre la creation, la gestion et le partage de cartes de visite digitales des collaborateurs de l'entreprise.  

L'application propose:

- un espace d'administration pour gerer les cartes, les directions et les titres/postes;
- une consultation publique de carte via lien (`?email=...`) et QR code;
- des fonctionnalites de partage (lien, QR code, image PNG) et de telechargement vCard;
- une interface bilingue (FR/EN);
- un parcours fluide sur mobile et desktop.

Cette fiche a pour objectif de verifier la conformite fonctionnelle, la stabilite et la qualite globale avant validation de mise en production.

---

## III. Evaluation de la couverture fonctionnelle de l'application

| N° | Fonctionnalites | Description | Resultat attendu | Resultat des tests |
|---:|---|---|---|---|
| 1 | Acces a l'application | L'utilisateur ouvre l'URL de l'application. | La page d'accueil se charge sans erreur. | OK |
| 2 | Changement de langue FR/EN | L'utilisateur change la langue depuis l'interface. | Les textes de l'interface basculent correctement FR/EN. | OK |
| 3 | Acces page login admin | L'utilisateur ouvre la page de connexion admin. | Le formulaire de connexion s'affiche. | OK |
| 4 | Connexion admin par email autorise | Saisie d'un email admin configure. | Redirection vers le back-office admin. | OK |
| 5 | Refus connexion email non autorise | Saisie d'un email non autorise. | Message d'erreur et acces refuse. | OK |
| 6 | Structure interface admin | Verification onglets Cartes / Directions / Titres-Postes. | Les 3 onglets sont visibles et navigables. | OK |
| 7 | Chargement liste cartes | L'admin ouvre l'onglet Cartes. | Les cartes existantes sont chargees et affichees. | OK |
| 8 | Creation d'une carte | L'admin cree une nouvelle carte. | La carte est enregistree et visible dans la liste. | OK |
| 9 | Edition d'une carte | L'admin modifie une carte existante. | Les modifications sont enregistrees et affichees. | OK |
| 10 | Suppression d'une carte | L'admin supprime une carte avec confirmation. | La carte est supprimee de la liste. | OK |
| 11 | Selection direction (liste) | Choix d'une direction depuis le select. | La direction est associee via `department_id`. | OK |
| 12 | Selection titre/poste (liste) | Choix d'un titre depuis le select. | Le titre est associe via `job_title_id`. | OK |
| 13 | Gestion Directions - ajout | Ajout d'une direction (libelle FR/EN). | Direction creee et visible en liste. | OK |
| 14 | Gestion Directions - modification | Edition d'une direction existante. | Direction mise a jour. | OK |
| 15 | Gestion Directions - suppression | Suppression d'une direction. | Direction retiree de la liste. | OK |
| 16 | Gestion Titres/Postes - ajout | Ajout d'un titre/poste FR/EN. | Titre cree et visible en liste. | OK |
| 17 | Gestion Titres/Postes - modification | Edition d'un titre existant. | Titre mis a jour. | OK |
| 18 | Gestion Titres/Postes - suppression | Suppression d'un titre. | Titre retire de la liste. | OK |
| 19 | Consultation carte par email | Ouverture URL `/?email=<email_existant>`. | La carte correspondante s'affiche correctement. | OK |
| 20 | Consultation carte email absent | Ouverture sans parametre `email`. | Message "email requis" affiche. | OK |
| 21 | Consultation carte introuvable | Ouverture avec email inexistant. | Message "carte non trouvee" (ou erreur geree). | OK |
| 22 | Affichage informations carte | Verification nom, titre, direction, contacts. | Informations exactes et bien presentees. | OK |
| 23 | Ordre des numeros | Verification affichage Tél, Fax, Mob. | Ordre conforme: Tél -> Fax -> Mob. | OK |
| 24 | Bouton Appeler | Clic sur action appel. | Appel sur mobile prioritaire (sinon telephone). | OK |
| 25 | Bouton Email | Clic sur action email. | Ouverture client mail (`mailto:`). | OK |
| 26 | Partage lien carte | Menu Partager -> partager lien. | Partage natif ou fallback (copie lien) fonctionne. | OK |
| 27 | Partage QR code | Menu Partager -> partager QR code. | QR partageable/telechargeable et exploitable. | OK |
| 28 | Affichage popover QR | Clic icone QR. | QR visible + action enregistrer contact disponible. | OK |
| 29 | Telechargement vCard | Clic "Enregistrer le contact". | Fichier `.vcf` telecharge et importable. | OK |
| 30 | Telechargement image carte | Clic "Telecharger la carte". | PNG genere sans erreur, fond correctement rendu. | OK |
| 31 | Partage image carte | Menu Partager -> image carte. | Partage natif si dispo, sinon telechargement fallback. | OK |
| 32 | API cartes - liste | `GET /api/cards?limit=...`. | Retour 200 + JSON valide. | OK |
| 33 | API cartes - by email | `GET /api/cards?email=...`. | Retour 200 (ou 404 si absent), format conforme. | OK |
| 34 | API directions | `GET /api/departments`. | Retour 200 + liste directions. | OK |
| 35 | API titres | `GET /api/job-titles`. | Retour 200 + liste titres. | OK |
| 36 | Gestion erreurs migration absente | Simulation schema incomplet. | Message d'erreur explicite renvoye/affiche. | OK |
| 37 | Performance API - lecture carte | Test de charge endpoint carte. | p95/p99 conformes aux seuils internes. | OK |
| 38 | Performance API - referentiels | Test de charge directions/titres. | Latence stable, taux erreur nul sur parcours nominal. | OK |
| 39 | Compatibilite mobile | Test sur smartphone (Android/iOS). | Interface lisible, actions principales fonctionnelles. | OK |
| 40 | Compatibilite desktop | Test Chrome/Edge/Firefox. | Fonctionnement nominal sans blocage. | OK |

> Note: remplacer "OK" par "KO" ou "NA" selon le resultat reel de la recette.

---

## IV. Decision

- [ ] **REJET**
- [ ] **VALIDATION SOUS RESERVE**
- [ ] **VALIDATION**

**Commentaires / Reserves**:  
[A completer]

---

## V. Validation de l'equipe de Test

| NOMS | DIRECTION | SIGNATURE |
|---|---|---|
| [A completer] | [A completer] | [A completer] |
| [A completer] | [A completer] | [A completer] |
| [A completer] | [A completer] | [A completer] |

---

## VI. Validation du Chef de departement

| NOMS | DIRECTION | SIGNATURE |
|---|---|---|
| [A completer] | [A completer] | [A completer] |

---

## VII. Validation de l'equipe de recette

| N° | NOMS | DIRECTION | SIGNATURE |
|---:|---|---|---|
| 1 | [A completer] | [A completer] | [A completer] |
| 2 | [A completer] | [A completer] | [A completer] |
| 3 | [A completer] | [A completer] | [A completer] |
| 4 | [A completer] | [A completer] | [A completer] |
| 5 | [A completer] | [A completer] | [A completer] |

---

## VIII. Validation des superieurs

| NOMS | FONCTION | SIGNATURE | DATE |
|---|---|---|---|
| [A completer] | [A completer] | [A completer] | [A completer] |
| [A completer] | [A completer] | [A completer] | [A completer] |

---

## Annexe (optionnelle) - Seuils de performance cibles

Les seuils ci-dessous sont indicatifs et doivent etre confirmes par la DSI:

- API lecture carte (`GET /api/cards?email=...`) :
  - p95 <= 300 ms
  - p99 <= 600 ms
  - taux d'erreur <= 1%
- API referentiels (`/api/departments`, `/api/job-titles`) :
  - p95 <= 250 ms
  - p99 <= 500 ms
  - taux d'erreur <= 1%
- Disponibilite applicative:
  - >= 99.5% sur plage ouvrable

