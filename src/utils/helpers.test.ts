import { describe, expect, it } from 'vitest';
import { Quest as QuestEntity } from '../services/quest.service';
import { QuestTaskConfigType, type Quest as QuestShape } from '../types/quest.types';
import { formatTime, getQuestData } from './helpers';

function createQuest(overrides: Partial<QuestShape> = {}) {
  const quest = {
    id: 'quest_1',
    preview: false,
    targeted_content: 0,
    user_status: {
      user_id: 'user_1',
      enrolled_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      claimed_at: null,
      progress: {
        [QuestTaskConfigType.WATCH_VIDEO]: {
          event_name: QuestTaskConfigType.WATCH_VIDEO,
          value: 40,
          updated_at: '2026-01-01T00:00:00.000Z',
          completed_at: null,
        },
      },
    },
    config: {
      id: 'quest_1',
      config_version: 1,
      starts_at: '2026-01-01T00:00:00.000Z',
      expires_at: '2026-12-31T00:00:00.000Z',
      features: 0,
      application: {
        id: 'app_1',
        name: 'Demo App',
        link: 'https://discord.com',
      },
      assets: {
        hero: '',
        hero_video: null,
        quest_bar_hero: '',
        quest_bar_hero_video: null,
        game_tile: '',
        logotype: '',
      },
      colors: {
        primary: '#000000',
        secondary: '#ffffff',
      },
      messages: {
        quest_name: 'Demo Quest',
        game_title: 'Demo Game',
        game_publisher: 'Demo Publisher',
      },
      task_config: {
        type: 1,
        join_operator: 'and',
        tasks: {
          [QuestTaskConfigType.WATCH_VIDEO]: {
            event_name: QuestTaskConfigType.WATCH_VIDEO,
            target: 100,
          },
        } as Record<QuestTaskConfigType, { event_name: string; target: number }>,
      },
      rewards_config: {
        assignment_method: 1,
        rewards_expire_at: null,
        platforms: 0,
        rewards: [
          {
            type: 1,
            sku_id: 'sku_1',
            messages: {
              name: 'Demo Reward',
              name_with_article: 'a Demo Reward',
            },
          },
        ],
      },
    },
    ...overrides,
  } satisfies QuestShape;

  return QuestEntity.create(quest);
}

describe('formatTime', () => {
  it('formats zero and negative durations as 0s', () => {
    expect(formatTime(0)).toBe('0s');
    expect(formatTime(-10)).toBe('0s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3661)).toBe('1h 1m 1s');
    expect(formatTime(61)).toBe('1m 1s');
  });
});

describe('getQuestData', () => {
  it('uses quest metadata and progress to calculate remaining seconds', () => {
    expect(getQuestData(createQuest())).toEqual({
      name: 'Demo Quest',
      remaining: 60,
      reward: 'Demo Reward',
    });
  });

  it('marks quests without supported tasks as unsupported', () => {
    const quest = createQuest({
      config: {
        ...createQuest().config,
        task_config: {
          type: 1,
          join_operator: 'and',
          tasks: {} as Record<
            QuestTaskConfigType,
            { event_name: string; target: number }
          >,
        },
      },
    });

    expect(getQuestData(quest).remaining).toBe(-1);
    expect(getQuestData(quest).reward).toBe('Unsupported');
  });
});
