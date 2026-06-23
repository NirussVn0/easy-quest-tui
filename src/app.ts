import chalk from 'chalk';
import { GatewayDispatchEvents } from 'discord-api-types/v9';
import type { AppConfig } from './config/env';
import { ClientQuest } from './services/api.service';
import type { ActiveQuest, UserInfo } from './types/quest.types';
import { createDashboardRenderer } from './ui/dashboard';
import { getQuestData } from './utils/helpers';

function toActiveQuest(
  quest: { id: string },
  details: ReturnType<typeof getQuestData>,
): ActiveQuest | null {
  if (details.remaining === -1) return null;

  return {
    id: quest.id,
    name: details.name,
    reward: details.reward,
    remaining: details.remaining,
    status: 'Running' as const,
  };
}

function isActiveQuest(quest: ActiveQuest | null): quest is ActiveQuest {
  return quest !== null;
}

export async function runQuestCli(config: AppConfig): Promise<number> {
  const client = new ClientQuest(config.token);
  let activeQuests: ActiveQuest[] = [];
  let isReady = false;

  return new Promise((resolve) => {
    let finished = false;
    const finish = (exitCode: number) => {
      if (finished) return;
      finished = true;
      resolve(exitCode);
    };

    client.websocketManager.on('error', ({ error }) => {
      console.error(chalk.red('Discord gateway error:'), error.message);
    });

    client.websocketManager.on('closed', ({ code }) => {
      if (!isReady) {
        console.error(chalk.red(`Discord gateway closed before ready. Code: ${code}`));
        finish(1);
      }
    });

    client.once(
      GatewayDispatchEvents.Ready,
      async ({ data }: { data: { user: UserInfo } }) => {
        try {
          isReady = true;
          console.log(chalk.cyan('⏳ Fetching quests...'));
          await client.fetchQuests();

          const manager = client.questManager;
          const validQuests = manager?.filterQuestsValid() ?? [];

          if (validQuests.length === 0) {
            console.log(chalk.red('❌ No valid quests found.'));
            finish(0);
            return;
          }

          activeQuests = validQuests
            .map((quest) => toActiveQuest(quest, getQuestData(quest)))
            .filter(isActiveQuest);

          if (activeQuests.length === 0) {
            console.log(chalk.yellow('⚠️ No supported active quests found.'));
            finish(0);
            return;
          }

          const startedAt = new Date();
          const dashboard = createDashboardRenderer({
            user: data.user,
            quests: [...activeQuests],
            startedAt,
          });

          const intervalId = setInterval(() => {
            activeQuests.forEach((quest) => {
              if (quest.status === 'Running' && quest.remaining > 0) {
                quest.remaining--;
              }
            });
            dashboard.update({
              user: data.user,
              quests: [...activeQuests],
              startedAt,
            });
          }, 1000);

          await Promise.allSettled(
            validQuests.map(async (quest) => {
              const activeQuest = activeQuests.find((item) => item.id === quest.id);
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
          dashboard.update({
            user: data.user,
            quests: [...activeQuests],
            startedAt,
          });
          dashboard.stop();
          finish(0);
        } catch (error) {
          console.error(chalk.red('Quest runner failed:'), error);
          finish(1);
        }
      },
    );

    console.log(chalk.cyan('⏳ Connecting to Discord gateway...'));
    client.connect().catch((error) => {
      console.error(chalk.red('Failed to connect to Discord gateway:'), error);
      finish(1);
    });
  });
}
