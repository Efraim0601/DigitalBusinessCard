# Cardyo - Simple PWA for Digital Business Card Creation

![Cardyo Screenshot](screenshot.png)

Cardyo is a lightweight Progressive Web App (PWA) that allows users to create and share digital business cards. All the card's data is embedded in the URL query parameters, making it easily shareable via a QR code or direct link.  

## 🚀 Features  

- 🖼️ **Customizable Cards**: Input Name, Company, Title, Avatar Image, Email, and Phone Number  
- 🔗 **URL-Based Storage**: No database required, all data lives in the URL query parameters  
- 📱 **PWA Support**: Installable on mobile and desktop  
- 📷 **QR Code Generation**: Instantly generate and download a QR code for easy sharing  
- 🖥️ **Lightweight & Fast**: Built with Nuxt.js for seamless performance
- 📋 **Downloadable Contact Card** (.vcf) format

## Installation

### Option 1 : Build et lancer avec Docker (serveur Ubuntu ou autre)

Prérequis : Docker installé sur le serveur (`sudo apt install docker.io` puis `sudo systemctl start docker`).

**1. Sur votre machine, cloner le projet et aller dans le dossier :**
```bash
cd /chemin/vers/cardyo
```

**2. Construire l’image Docker :**
```bash
docker build -f dockerfile -t cardyo:latest .
```
(La construction peut prendre quelques minutes.)

**3. Lancer le conteneur :**
```bash
docker run -d -p 8080:3000 --name cardyo cardyo:latest
```
- `-d` : exécution en arrière-plan  
- `-p 8080:3000` : port de l’hôte **8080** → port du conteneur **3000** (modifier 8080 si besoin)  
- `--name cardyo` : nom du conteneur

**4. Accéder à l’application :**  
Ouvrir dans un navigateur : `http://<IP-du-serveur>:8080`

**Commandes utiles :**
```bash
# Voir les conteneurs en cours
docker ps

# Arrêter l’application
docker stop cardyo

# Redémarrer
docker start cardyo

# Voir les logs
docker logs cardyo
```

### Option 2 : Utiliser une image déjà publiée

Si une image est publiée (ex. sur ghcr.io) :

- Télécharger l’image :
```
docker pull ghcr.io/kyaustad/cardyo:latest
```
- Lancer le conteneur :
```
docker run -d -p 8080:3000 ghcr.io/kyaustad/cardyo:latest
```
Le `-d` lance le conteneur en arrière-plan. Vous pouvez remplacer `8080` par le port hôte de votre choix. Le port **3000** à l’intérieur du conteneur ne doit pas être modifié.

### Unraid Installation

- Go to the Docker tab and at the bottom press, Add Container.
- For the repsitory put:
```
ghcr.io/kyaustad/cardyo:latest
```
-  Then scroll down and add a new port and for the container port put ``` 3000 ``` and for the Host port put whatever you want it to run on.
-  Thats it! You have to name the image and when you hit apply it will pull the image and run it if there are no conflicts.

IF ANYONE WITH AN UNRAID CA REPO WANTS TO HOST THIS PLEASE DO! Let me know but I'd love to have it on the community apps.

## Base de données (admin cartes, directions, titres)

Si vous utilisez la page **Admin** (gestion des cartes, directions, titres/postes), une base PostgreSQL est requise. Les tables `departments` et `job_titles` doivent être créées via la migration :

```bash
# Exemple (ajuster utilisateur, base, chemin)
psql -U vcard -d vcard -f sql/migration_departments_job_titles.sql
```

Avec Docker (remplacer `nom_conteneur_postgres` par le nom de votre conteneur PostgreSQL) :

```bash
docker exec -i nom_conteneur_postgres psql -U vcard -d vcard < sql/migration_departments_job_titles.sql
```

Sans cette migration, les boutons « Enregistrer » des onglets **Directions** et **Titres / Postes** renverront une erreur (table absente).

## 🛠️ Tech Stack  

- **Nuxt.js** (Vue 3 & Vite)  
- **PWA Module** for offline support  
- **QR Code Generator**  
- **Tailwind CSS** for styling  



## 🔄 How It Works  

1. Enter your details (Name, Company, Title, Avatar URL, Email, Phone)  
2. Generate a shareable link with all data encoded in the URL  
3. Download a QR code for quick sharing  
4. Others can scan or click the link to instantly see the digital card  

## 📜 License  

This project is licensed under the [MIT License](LICENSE).  

---

💡 **Contributions are welcome!** Feel free to submit issues or pull requests.  
