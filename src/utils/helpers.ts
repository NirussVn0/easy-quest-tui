import type { Quest, QuestTaskType, QuestTask } from '../types/index';
import { SUPPORTED_TASK_TYPES } from '../types/index';
import { QUEST_DB } from '../config/questDb';

/**
 * Format seconds into a human-readable duration string.
 * e.g. 3661 → "1h 1m 1s"
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

/**
 * Truncate a token for display purposes.
 * Shows first 12 chars + "..."
 */
export function maskToken(token: string): string {
  if (token.length <= 16) return token.slice(0, 8) + '...';
  return token.slice(0, 12) + '...';
}

/**
 * Find the first supported task type for a quest.
 */
export function findSupportedTask(
  tasks: Partial<Record<QuestTaskType, QuestTask>> | undefined,
): QuestTaskType | null {
  if (!tasks) return null;
  for (const type of SUPPORTED_TASK_TYPES) {
    if (tasks[type]) return type;
  }
  return null;
}

export interface QuestDisplayData {
  name: string;
  /** Seconds remaining to complete, -1 if unsupported */
  remaining: number;
  /** Total seconds (target) */
  total: number;
  reward: string;
}

/**
 * Extract display data from a quest object.
 * Uses hardcoded QUEST_DB for known quest names, falls back to API metadata.
 */
export function getQuestData(quest: Quest): QuestDisplayData {
  const questId = quest.id || quest.config?.id || 'unknown';
  let name: string;
  let reward = 'Unknown';

  if (QUEST_DB[questId]) {
    name = QUEST_DB[questId].name;
  } else if (quest.config?.messages?.quest_name) {
    name = quest.config.messages.quest_name.trim();
  } else {
    name = questId.toString();
  }

  const taskConfig = (quest.config?.task_config ??
    (quest.config as any)?.task_config_v2) as
    | { tasks?: Partial<Record<QuestTaskType, QuestTask>> }
    | undefined;

  const tasks = taskConfig?.tasks;
  const supported = findSupportedTask(tasks);

  if (!supported || !tasks?.[supported]) {
    return { name, remaining: -1, total: 0, reward: 'Unsupported' };
  }

  const target = tasks[supported]!.target;
  const progress = quest.user_status?.progress?.[supported]?.value ?? 0;
  const remaining = Math.max(0, target - progress);

  const rewards = quest.config?.rewards_config?.rewards;
  if (rewards && rewards.length > 0) {
    if (rewards[0].messages?.name) {
      reward = rewards[0].messages.name;
    } else if (rewards[0].orb_quantity) {
      reward = `${rewards[0].orb_quantity} Orbs`;
    }
  }

  return { name, remaining, total: target, reward };
}

/**
 * Truncate a proxy URL for display purposes.
 * Hides user/password credentials from the proxy string if present.
 */
export function maskProxy(proxyUrl: string): string {
  if (!proxyUrl) return 'none';
  try {
    const url = new URL(proxyUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return proxyUrl;
  }
}
