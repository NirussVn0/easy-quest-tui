import chalk from 'chalk';
import { runQuestCli } from './app';
import { readConfig } from './config/env';

try {
  const config = readConfig(process.env);
  const exitCode = await runQuestCli(config);
  process.exit(exitCode);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(message));
  process.exit(1);
}
