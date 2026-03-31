# Tests unitaires - vcard app

Ce projet utilise **Vitest** pour les tests unitaires.

---

## 1) Installation

Dans le dossier du projet:

```bash
cd /home/wuwei/Documents/AFRILAND/cardyo
npm install
```

---

## 2) Lancer les tests

### 2.1 Execution une seule fois

```bash
npm test
```

### 2.2 Mode watch (developpement)

```bash
npm run test:watch
```

### 2.3 Couverture de code

```bash
npm run test:coverage
```

Sorties:

- console: resume de couverture
- `coverage/` (rapport HTML + JSON)

---

## 3) Ce qui est teste (couverture actuelle)

### 3.1 i18n des valeurs metier (carte)

Fichier teste:

- `app/locales/card-value-translations.ts`

Tests:

- traduction FR -> EN pour titres et directions connus
- normalisation (espaces)
- fallbacks (valeurs inconnues, null/undefined)

Fichier de test:

- `tests/unit/card-value-translations.test.ts`

### 3.2 Mapping de la reponse API cartes (server)

Fichier teste:

- `server/utils/card-mapper.ts`

Tests:

- mapping de lignes SQL jointees vers la forme renvoyee par l'API
- comportement quand `department_id` / `job_title_id` sont absents

Fichier de test:

- `tests/unit/card-mapper.test.ts`

### 3.3 Script de benchmark de performance (preflight)

Fichier teste:

- `scripts/perf-bench.mjs`

Tests:

- echec rapide si la base URL est injoignable (preflight)
- execution possible avec `--skipPreflight`

Fichier de test:

- `tests/unit/perf-bench.test.ts`

---

## 4) Ajouter de nouveaux tests

### 4.1 Regle generale

- Mettre les tests dans `tests/unit/`.
- Nommer les fichiers `*.test.ts`.

### 4.2 Conseils pour tester les composants Nuxt/Vue

Beaucoup de composants Nuxt utilisent des auto-imports (ex: `useRoute`, `useAppConfig`, `useHead`).  
Pour des **tests unitaires stables**, privilegier:

- extraire la logique pure dans des fonctions utilitaires exportees (faciles a tester),
- tester ces fonctions (plutot que de monter le composant complet) quand le composant depend fortement de Nuxt runtime.

---

## 5) Notes

- Les tests E2E (navigateur) ne sont pas inclus ici. Ils seraient a faire avec Playwright/Cypress.
- Les vulnerabilites npm signalees par `npm install` doivent etre traitees dans un chantier securite separe (audit + upgrades), sans bloquer la mise en place des tests unitaires.

