/** Spécification OpenAPI 3.0 minimale (DOC-002 / qualité DSIT). */
export function buildOpenApiDocument(baseUrl: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "V-CARD API",
      description:
        "API Carte de visite digitale Afriland First Bank. Authentification admin : cookie httpOnly `vcard_admin_session` après POST /api/auth/admin/login.",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl || "/", description: "Instance" }],
    paths: {
      "/api/openapi": {
        get: {
          summary: "Spécification OpenAPI (ce document)",
          responses: { "200": { description: "Schéma OpenAPI JSON" } },
        },
      },
      "/api/auth/admin/login": {
        post: {
          summary: "Connexion administrateur",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Session créée (Set-Cookie)" },
            "400": { description: "Paramètres manquants" },
            "401": { description: "Identifiants invalides" },
            "503": { description: "Timeout ou surcharge" },
          },
        },
      },
      "/api/auth/admin/logout": {
        post: {
          summary: "Déconnexion administrateur",
          responses: { "200": { description: "Cookie supprimé" } },
        },
      },
      "/api/auth/admin/me": {
        get: {
          summary: "Session admin courante",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "{ authenticated: boolean }" },
            "401": { description: "Non authentifié" },
          },
        },
      },
      "/api/cards": {
        get: {
          summary: "Liste paginée des cartes",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
            { name: "q", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Page de cartes" }, "401": { description: "Admin requis" } },
        },
        post: {
          summary: "Créer une carte",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Carte créée" }, "401": { description: "Admin requis" } },
        },
      },
      "/api/cards/{id}": {
        put: {
          summary: "Mettre à jour une carte",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" }, "401": { description: "Admin requis" } },
        },
        delete: {
          summary: "Supprimer une carte",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" }, "401": { description: "Admin requis" } },
        },
      },
      "/api/departments": {
        get: {
          summary: "Liste directions / départements (cache court sans ?q)",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "offset", in: "query", schema: { type: "integer" } },
            { name: "q", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "OK" }, "401": { description: "Admin requis" } },
        },
        post: {
          summary: "Créer un libellé département",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "OK" }, "401": { description: "Admin requis" } },
        },
      },
      "/api/departments/{id}": {
        put: {
          summary: "Modifier un département",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" } },
        },
        delete: {
          summary: "Supprimer un département",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/job-titles": {
        get: {
          summary: "Liste titres / postes (cache court sans ?q)",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "offset", in: "query", schema: { type: "integer" } },
            { name: "q", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "OK" }, "401": { description: "Admin requis" } },
        },
        post: {
          summary: "Créer un libellé poste",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/job-titles/{id}": {
        put: {
          summary: "Modifier un titre",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" } },
        },
        delete: {
          summary: "Supprimer un titre",
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/convertImage": {
        get: {
          summary: "Télécharge une image distante et renvoie le base64",
          parameters: [
            { name: "url", in: "query", required: true, schema: { type: "string", format: "uri" } },
          ],
          responses: {
            "200": { description: "{ base64 }" },
            "400": { description: "url manquant" },
            "500": { description: "Échec fetch" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "vcard_admin_session",
        },
      },
    },
  };
}
