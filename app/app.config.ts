export default defineAppConfig({
  // Informations statiques de l'entreprise (carte de visite)
  company: {
    name: "Afriland First Bank",
    /** Image de fond de la carte (exporter le PDF en PNG et placer dans public/). Vide = pas de logo ni fond template. */
    cardBackground: "/carte-digitale-bg.png",
    address: "Place de l'Indépendance",
    addressComplement: "B.P: 11834 Yaoundé - Cameroun",
    telex: "8907 KN",
    website: "www.afrilandfirstbank.com",
  },
  admin: {
    email: "admin@afrilandfirstbank.com",
    password: "adminabf@afrilandfirstbank.com",
  },
  // https://ui3.nuxt.dev/getting-started/theme#design-system
  ui: {
    colors: {
      primary: "emerald",
      neutral: "zinc",
    },
    button: {
      slots: {
        base: "rounded-none border-none",
      },
      defaultVariants: {
        // Set default button color to neutral
        // color: 'neutral'
      },
    },
  },
});
