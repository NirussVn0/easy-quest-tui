import { describe, expect, it } from 'vitest';
import type { REST } from '@discordjs/rest';
import { Quest, executeQuest } from './quest-manager';
import { QuestTaskType, type Quest as QuestShape } from '../types/index';

describe('executeQuest', () => {
  it('stops a quest after its configured deadline', async () => {
    const quest = Quest.create({
      id: 'quest-1',
      config: {
        expires_at: '2099-01-01T00:00:00.000Z',
        application: { id: 'app-1' },
        task_config: {
          tasks: {
            [QuestTaskType.WATCH_VIDEO]: {
              event_name: QuestTaskType.WATCH_VIDEO,
              target: 60,
            },
          },
        },
      },
      user_status: {
        user_id: 'user-1',
        enrolled_at: new Date().toISOString(),
        completed_at: null,
        claimed_at: null,
        progress: {},
      },
      targeted_content: 0,
      preview: false,
    } as QuestShape);

    const result = await executeQuest({
      rest: {} as REST,
      quest,
      questTimeoutMs: -1,
    });

    expect(result).toBe('error');
  });
});
