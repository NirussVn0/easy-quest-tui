#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { App } from './ui/components';

async function main(): Promise<number> {
  // Start Ink TUI immediately
  const { waitUntilExit } = render(<App />);

  // Wait for the user to press Ctrl+C or process.exit to be called
  await waitUntilExit().catch(() => {});
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Fatal:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
