'use server';

interface EnvCheckResult {
  name: string;
  isValid: boolean;
  label: string;
}

export async function checkEnvs(): Promise<{
  envs: EnvCheckResult[];
  allValid: boolean;
}> {
  if (process.env.NODE_ENV === 'production') {
    return {
      envs: [],
      allValid: true,
    };
  }

  const requiredEnvs = [{ name: 'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN', label: 'Shopify Store Domain' }];

  const envs: EnvCheckResult[] = requiredEnvs.map(env => ({
    name: env.name,
    label: env.label,
    isValid: Boolean(process.env[env.name]),
  }));

  const allValid = envs.every(env => env.isValid);

  return {
    envs,
    allValid,
  };
}
