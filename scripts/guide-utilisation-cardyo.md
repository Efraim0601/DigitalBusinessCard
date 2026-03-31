# Guide d'utilisation - vcard

Version: 1.0  
Date: 2026-03-23  
Public cible: Utilisateurs metier, RH, communication, administrateurs

---

## Table des matieres

1. [Presentation rapide](#1-presentation-rapide)  
2. [Acces a l'application](#2-acces-a-lapplication)  
3. [Connexion a l'administration](#3-connexion-a-ladministration)  
4. [Gestion des cartes (Onglet Cartes)](#4-gestion-des-cartes-onglet-cartes)  
5. [Gestion des directions (Onglet Directions)](#5-gestion-des-directions-onglet-directions)  
6. [Gestion des titres/postes (Onglet TitresPostes)](#6-gestion-des-titrespostes-onglet-titrespostes)  
7. [Consultation publique d'une carte](#7-consultation-publique-dune-carte)  
8. [Partage et actions sur la carte](#8-partage-et-actions-sur-la-carte)  
9. [Langue de l'application (FR/EN)](#9-langue-de-lapplication-fren)  
10. [Bonnes pratiques d'utilisation](#10-bonnes-pratiques-dutilisation)  
11. [FAQ / Problemes courants](#11-faq--problemes-courants)

---

## 1. Presentation rapide

vcard est une application de carte de visite digitale qui permet de:

- creer et modifier les cartes des collaborateurs;
- gerer les referentiels de directions et titres/postes (FR/EN);
- consulter une carte via lien ou QR code;
- partager une carte (lien, image, QR);
- telecharger un contact (vCard).

---

## 2. Acces a l'application

### 2.1 URL de l'application

L'application est accessible via l'URL communiquee par la DSI (exemple):

- `https://vcard.votre-domaine.com`

### 2.2 Ecrans principaux

- **Page publique**: consultation d'une carte de visite.
- **Page login admin**: acces au back-office.
- **Page admin**: gestion des cartes, directions et titres/postes.

---

## 3. Connexion a l'administration

### 3.1 Principe

La connexion admin se fait **par email uniquement** (pas de mot de passe dans la version actuelle).

### 3.2 Etapes

1. Ouvrir la page de login admin.
2. Saisir l'email admin autorise.
3. Cliquer sur le bouton de connexion.
4. Si l'email est valide, l'utilisateur est redirige vers la page admin.

### 3.3 En cas d'echec

- Verifier l'orthographe de l'email.
- Contacter la DSI si l'email n'est pas reconnu.

---

## 4. Gestion des cartes (Onglet Cartes)

Dans l'administration, ouvrir l'onglet **Cartes**.

### 4.1 Lire la liste des cartes

Le tableau affiche:

- email;
- nom;
- direction;
- titre/poste;
- actions.

### 4.2 Creer une carte

1. Cliquer sur **Creer une carte**.
2. Renseigner les informations:
   - email (obligatoire),
   - prenom / nom,
   - direction (selection dans la liste),
   - titre/poste (selection dans la liste),
   - telephone, fax, mobile.
3. Cliquer sur **Enregistrer**.

### 4.3 Modifier une carte

1. Cliquer sur la ligne de la carte dans le tableau.
2. Le formulaire se remplit automatiquement.
3. Modifier les champs necessaires.
4. Cliquer sur **Enregistrer**.

### 4.4 Supprimer une carte

1. Cliquer sur **Supprimer** sur la ligne concernee.
2. Confirmer la suppression.

### 4.5 Regles importantes

- Le champ **email** identifie la carte.
- Direction et Titre/Poste sont choisis via des listes administrees.
- En cas d'erreur, un message explicite s'affiche.

---

## 5. Gestion des directions (Onglet Directions)

### 5.1 Ajouter une direction

1. Ouvrir l'onglet **Directions**.
2. Cliquer sur **Ajouter une direction**.
3. Saisir:
   - libelle FR,
   - libelle EN.
4. Cliquer sur **Enregistrer**.

### 5.2 Modifier une direction

1. Cliquer sur **Editer** sur la ligne de la direction.
2. Modifier les libelles FR/EN.
3. Cliquer sur **Enregistrer**.

### 5.3 Supprimer une direction

1. Cliquer sur **Supprimer**.
2. Confirmer.

---

## 6. Gestion des titres/postes (Onglet Titres/Postes)

Le fonctionnement est identique a l'onglet Directions.

### 6.1 Ajouter un titre/poste

1. Ouvrir l'onglet **Titres/Postes**.
2. Cliquer sur **Ajouter**.
3. Saisir les libelles FR/EN.
4. Cliquer sur **Enregistrer**.

### 6.2 Modifier / supprimer

- **Modifier**: bouton **Editer**.
- **Supprimer**: bouton **Supprimer** + confirmation.

---

## 7. Consultation publique d'une carte

### 7.1 Ouvrir une carte

Une carte est consultee via un lien du type:

- `https://.../?email=prenom.nom@domaine.com`

### 7.2 Affichage

La carte affiche:

- nom du collaborateur;
- titre/poste;
- direction;
- informations de contact (Tel, Fax, Mob);
- informations institutionnelles (adresse, telex, site web).

### 7.3 Cas ou la carte est introuvable

Si l'email n'existe pas, un message d'erreur s'affiche (ex: carte non trouvee).

---

## 8. Partage et actions sur la carte

Sur la page carte, plusieurs actions sont disponibles.

### 8.1 Partager

Le menu **Partager** permet:

- partager l'image de la carte (PNG);
- partager le lien de la carte;
- partager le QR code menant vers la carte.

Selon le navigateur:

- si Web Share est disponible -> partage natif;
- sinon -> copie de lien ou telechargement en fallback.

### 8.2 QR code

- Afficher un QR code de la carte.
- Le QR peut etre scanne pour ouvrir la carte.

### 8.3 Enregistrer le contact

- Bouton **Enregistrer le contact** -> telechargement d'une fiche `.vcf`.
- Le fichier peut etre importe dans les contacts du telephone.

### 8.4 Telecharger la carte

- Bouton de telechargement de la carte en image (PNG).

### 8.5 Appeler / Envoyer un email

- Bouton **Appeler** -> lance un appel telephonique.
- Bouton **Email** -> ouvre le client de messagerie.

---

## 9. Langue de l'application (FR/EN)

### 9.1 Changement de langue

L'application prend en charge le francais et l'anglais.

### 9.2 Effets du changement

- Les libelles d'interface sont traduits.
- Les directions et titres/postes s'affichent en FR ou EN selon la langue choisie.

---

## 10. Bonnes pratiques d'utilisation

- Toujours verifier l'email avant d'enregistrer une carte.
- Completer les champs FR/EN pour directions et titres.
- Eviter les doublons de direction/titre (orthographe normalisee).
- Tester le lien de la carte apres creation/modification.
- Verifier l'affichage mobile avant diffusion large.

---

## 11. FAQ / Problemes courants

### 11.1 "Je ne peux pas me connecter a l'admin"

- Verifier que l'email saisi est autorise.
- Verifier la langue/clavier (caracteres speciaux).
- Contacter la DSI pour ajouter/metter a jour l'email admin.

### 11.2 "Le bouton Enregistrer ne marche pas"

- Verifier les champs obligatoires (email, labels FR/EN selon l'onglet).
- Lire le message d'erreur affiche en rouge.
- Recharger la page puis recommencer.

### 11.3 "Erreur serveur sur Directions/Titres"

- Le schema base de donnees peut ne pas etre a jour.
- Transmettre l'incident a la DSI (migration SQL a executer).

### 11.4 "La carte ne s'affiche pas"

- Verifier le parametre `email` dans l'URL.
- Verifier que la carte existe en admin.

### 11.5 "Le partage ne fonctionne pas sur mon navigateur"

- Utiliser l'option fallback (copie de lien / telechargement).
- Tester sur un navigateur recent (Chrome, Edge, Firefox, Safari).

---

## Contact support

Pour toute demande d'assistance:

- Equipe support fonctionnel: [a completer]
- Equipe DSI / exploitation: [a completer]
- Delai cible de prise en charge: [a completer]

