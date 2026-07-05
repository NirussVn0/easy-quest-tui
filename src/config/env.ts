import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AccountConfig {
  token: string;
  proxy?: string;
}

export interface AppConfig {
  /** Array of Discord accounts with token and optional proxy */
  accounts: AccountConfig[];
  /** Concurrency limit for quest operations per account */
  concurrency: number;
  /** Path to tokens file (one token per line) */
  tokensFile: string;
}

function loadTokensFromFile(filePath: string): AccountConfig[] {
  try {
    const resolved = resolve(filePath);
    if (!existsSync(resolved)) return [];
    const content = readFileSync(resolved, 'utf-8');

    // Check if proxies.txt also exists in the same directory to match line-by-line
    const dir = resolve(filePath, '..');
    const proxiesPath = resolve(dir, 'proxies.txt');
    let fileProxies: string[] = [];
    if (existsSync(proxiesPath)) {
      fileProxies = readFileSync(proxiesPath, 'utf-8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
    }

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line, index) => {
        if (line.includes('|')) {
          const [token, proxy] = line.split('|').map((s) => s.trim());
          return { token, proxy: proxy || undefined };
        }
        const proxy = fileProxies[index];
        return { token: line, proxy: proxy || undefined };
      });
  } catch {
    return [];
  }
}

function loadAccountsFromEnv(): AccountConfig[] {
  const accounts: AccountConfig[] = [];

  // Support TOKEN_1/PROXY_1, TOKEN_2/PROXY_2, ...
  for (let i = 1; i <= 100; i++) {
    const token = process.env[`TOKEN_${i}`]?.trim();
    const proxy = process.env[`PROXY_${i}`]?.trim();
    if (token) {
      accounts.push({ token, proxy: proxy || undefined });
    } else {
      break;
    }
  }

  // Support TOKENS=token1,token2 and PROXIES=proxy1,proxy2
  if (accounts.length === 0 && process.env.TOKENS?.trim()) {
    const envTokens = process.env.TOKENS.split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const envProxies =
      process.env.PROXIES?.split(',')
        .map((p) => p.trim())
        .filter(Boolean) || [];

    envTokens.forEach((token, index) => {
      const proxy = envProxies[index];
      accounts.push({ token, proxy: proxy || undefined });
    });
  }

  // Legacy single TOKEN support
  if (accounts.length === 0 && process.env.TOKEN?.trim()) {
    accounts.push({
      token: process.env.TOKEN.trim(),
      proxy: process.env.PROXY?.trim() || undefined,
    });
  }

  return accounts;
}

export function readConfig(): AppConfig {
  const tokensFile = process.env.TOKENS_FILE || 'tokens.txt';

  const accountsFromFile = loadTokensFromFile(tokensFile);
  const accountsFromEnv = loadAccountsFromEnv();

  const accounts = [...accountsFromFile, ...accountsFromEnv];
  const seenTokens = new Set<string>();
  const uniqueAccounts: AccountConfig[] = [];

  for (const acc of accounts) {
    if (!seenTokens.has(acc.token)) {
      seenTokens.add(acc.token);
      uniqueAccounts.push(acc);
    }
  }

  if (uniqueAccounts.length === 0) {
    throw new Error(
      '❌ No accounts found.\n' +
        '  Add accounts via:\n' +
        '    1. tokens.txt (one per line, optionally with |proxy)\n' +
        '    2. proxies.txt containing proxies corresponding to tokens.txt lines\n' +
        '    3. TOKEN_1=..., PROXY_1=... in .env\n' +
        '    4. TOKENS=token1,token2 and PROXIES=proxy1,proxy2 in .env\n' +
        '    5. TOKEN=..., PROXY=... in .env',
    );
  }

  const concurrency = Math.min(Math.max(Number(process.env.CONCURRENCY) || 3, 1), 10);

  return {
    accounts: uniqueAccounts,
    concurrency,
    tokensFile,
  };
}
