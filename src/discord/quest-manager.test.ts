import { describe, expect, it, vi } from 'vitest';
import type { REST } from '@discordjs/rest';
import { Quest, executeQuest } from './quest-manager';
import { QuestTaskType, type Quest as QuestShape } from '../types/index';

vi.mock('../core/anti-detect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../core/anti-detect')>()),
  heartbeatSleep: vi.fn().mockResolvedValue(undefined),
}));

describe('executeQuest', () => {
  it('enrolls mobile-only video quests as an Android client', async () => {
    const enrolledStatus = {
      user_id: 'user-1',
      enrolled_at: new Date().toISOString(),
      completed_at: null,
      claimed_at: null,
      progress: {},
    };
    const post = vi.fn().mockResolvedValue(enrolledStatus);
    const quest = Quest.create({
      id: 'mobile-quest',
      config: {
        expires_at: '2099-01-01T00:00:00.000Z',
        application: { id: 'app-1' },
        task_config: {
          tasks: {
            [QuestTaskType.WATCH_VIDEO_ON_MOBILE]: {
              event_name: QuestTaskType.WATCH_VIDEO_ON_MOBILE,
              target: 0,
            },
          },
        },
      },
      user_status: null,
      targeted_content: 0,
      preview: false,
      traffic_metadata_raw: 'raw-metadata',
      traffic_metadata_sealed: 'sealed-metadata',
    } as QuestShape);

    const result = await executeQuest({ rest: { post } as unknown as REST, quest });

    expect(result).toBe('completed');
    expect(post).toHaveBeenCalledWith('/quests/mobile-quest/enroll', {
      body: {
        location: 12,
        is_targeted: false,
        metadata_raw: null,
        metadata_sealed: null,
        traffic_metadata_raw: 'raw-metadata',
        traffic_metadata_sealed: 'sealed-metadata',
      },
      headers: { AndroidRequest: 'true' },
    });
    expect(quest.userStatus).toEqual(enrolledStatus);
  });

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

  it('reports heartbeat progress without showing the quest as complete early', async () => {
    const progressUpdates: number[] = [];
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        user_id: 'user-1',
        enrolled_at: new Date().toISOString(),
        completed_at: null,
        claimed_at: null,
        progress: {
          [QuestTaskType.PLAY_ON_DESKTOP]: {
            event_name: QuestTaskType.PLAY_ON_DESKTOP,
            value: 60,
            updated_at: new Date().toISOString(),
            completed_at: null,
          },
        },
      })
      .mockResolvedValueOnce({
        user_id: 'user-1',
        enrolled_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        claimed_at: null,
        progress: {
          [QuestTaskType.PLAY_ON_DESKTOP]: {
            event_name: QuestTaskType.PLAY_ON_DESKTOP,
            value: 120,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
        },
      })
      .mockResolvedValueOnce({});
    const quest = Quest.create({
      id: 'heartbeat-quest',
      config: {
        expires_at: '2099-01-01T00:00:00.000Z',
        application: { id: 'app-1' },
        task_config: {
          tasks: {
            [QuestTaskType.PLAY_ON_DESKTOP]: {
              event_name: QuestTaskType.PLAY_ON_DESKTOP,
              target: 120,
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
      rest: { post } as unknown as REST,
      quest,
      onProgress: (remaining) => progressUpdates.push(remaining),
    });

    expect(result).toBe('completed');
    expect(progressUpdates).toEqual([60, 0, 0]);
  });
});
