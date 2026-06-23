import { GatewayDispatchEvents } from 'discord-api-types/v9';
import chalk from 'chalk';
import logUpdate from 'log-update';
import { ClientQuest } from './services/api.service';
import { renderScreen } from './ui/cli.ui';
import { getQuestData } from './utils/helpers';
import { ActiveQuest, UserInfo } from './types/quest.types';

const token = process.env.TOKEN?.trim();

if (!token) {
  console.error(chalk.red('Missing TOKEN in .env.'));
  process.exit(1);
}

const client = new ClientQuest(token);

let activeQuests: ActiveQuest[] = [];
let isReady = false;

client.websocketManager.on('error', ({ error }) => {
  console.error(chalk.red('Discord gateway error:'), error.message);
});

client.websocketManager.on('closed', ({ code }) => {
  if (!isReady) {
    console.error(chalk.red(`Discord gateway closed before ready. Code: ${code}`));
  }
});

logUpdate(chalk.cyan('⏳ Connecting to Discord gateway...'));

client.once(
  GatewayDispatchEvents.Ready,
  async ({ data }: { data: { user: UserInfo } }) => {
    isReady = true;
    logUpdate(chalk.cyan('⏳ Fetching quests...'));
    await client.fetchQuests();

    const manager = client.questManager;
    const validQuests = manager?.filterQuestsValid() ?? [];

    if (validQuests.length === 0) {
      logUpdate(chalk.red('\u274c No valid quests found.'));
      process.exit(0);
    }

    activeQuests = validQuests
      .map((quest) => {
        const details = getQuestData(quest);
        if (details.remaining === -1) return null;

        return {
          id: quest.id,
          name: details.name,
          reward: details.reward,
          remaining: details.remaining,
          status: 'Running' as const,
        } as ActiveQuest;
      })
      .filter((q): q is ActiveQuest => q !== null);

    if (activeQuests.length === 0) {
      logUpdate(chalk.yellow('⚠️ No supported active quests found.'));
      process.exit(0);
    }

    const intervalId = setInterval(() => {
      activeQuests.forEach((quest) => {
        if (quest.status === 'Running' && quest.remaining > 0) {
          quest.remaining--;
        }
      });
      renderScreen(data.user, activeQuests);
    }, 1000);

    await Promise.allSettled(
      validQuests.map(async (quest) => {
        const activeQuest = activeQuests.find((q) => q.id === quest.id);
        if (!activeQuest) return;

        try {
          await manager!.doingQuest(quest);
          activeQuest.status = 'Done';
          activeQuest.remaining = 0;
        } catch {
          activeQuest.status = 'Error';
        }
      }),
    );

    clearInterval(intervalId);
    renderScreen(data.user, activeQuests);

    process.exit(0);
  },
);

client.connect().catch((err) => {
  console.error(chalk.red('Failed to connect to Discord gateway:'), err);
});
