export interface AppConfig {
  token: string;
}

export function readConfig(env: NodeJS.ProcessEnv): AppConfig {
  const token = env.TOKEN?.trim();

  if (!token) {
    throw new Error('Missing TOKEN in .env.');
  }

  return { token };
}
