declare module "nuxt/schema" {
  interface AppConfigInput {
    company?: {
      name?: string;
      logo?: string;
      cardBackground?: string;
      address?: string;
      addressComplement?: string;
      telex?: string;
      website?: string;
    };
    admin?: {
      email?: string;
      password?: string;
    };
  }
}

export {};
