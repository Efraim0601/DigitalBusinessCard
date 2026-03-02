declare module "nuxt/schema" {
  interface AppConfigInput {
    company?: {
      name?: string;
      logo?: string;
      address?: string;
      addressComplement?: string;
      website?: string;
    };
  }
}

export {};
