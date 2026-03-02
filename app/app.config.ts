export default defineAppConfig({
  // Informations statiques de l'entreprise (carte de visite)
  company: {
    name: "Afriland First Bank",
    logo: "/Logo_Afriland-remove.png",
    address: "Place de l'Indépendance",
    addressComplement: "B.P: 11834 Yaoundé - Cameroun",
    website: "www.afrilandfirstbank.com",
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
