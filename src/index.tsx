#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { readConfig } from './config/env';
import { Orchestrator } from './core/orchestrator';
import { App } from './ui/components';
import type { AccountState } from './types/index';

async function main(): Promise<number> {
  // 1. Load configuration (multi-token)
  const config = readConfig();

  console.error(`\n  🚀 Lazy Quest — ${config.accounts.length} account(s) loaded\n`);

  // 2. Start Ink TUI immediately
  const { waitUntilExit, clear } = render(<App accounts={[]} />);

  // 3. Create orchestrator and wire up UI updates
  const orchestrator = new Orchestrator(config.accounts);

  const accountsRef: { current: AccountState[] } = { current: [] };

  orchestrator.on('update', (accounts) => {
    accountsRef.current = accounts;
    clear();
    render(<App accounts={accounts} />);
  });

  // 4. Run orchestrator (concurrent multi-account farming)
  await orchestrator.start();

  // 5. Final render with results
  clear();
  render(<App accounts={accountsRef.current} />);

  // Let user read final output
  await new Promise((resolve) => setTimeout(resolve, 2000));
  waitUntilExit().catch(() => {});

  const failed = accountsRef.current.filter((a) => a.status === 'error').length;
  return failed > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Fatal:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
