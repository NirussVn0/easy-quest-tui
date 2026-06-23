import { Quest } from '../services/quest.service';
import { QUEST_DB } from '../config/questDb';
import { QuestTaskConfigType } from '../types/quest.types';

export function formatTime(seconds: number): string {
  if (seconds <= 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${remainingSeconds}s`;
}

export function getQuestData(quest: Quest): {
  name: string;
  remaining: number;
  reward: string;
} {
  const questId = quest.id || quest.config?.id || 'unknown';
  let name: string;
  let remaining = 900;
  let reward = 'Unknown';

  if (QUEST_DB[questId]) {
    name = QUEST_DB[questId].name;
    remaining = QUEST_DB[questId].duration;
  } else if (quest.config?.messages?.quest_name) {
    name = quest.config.messages.quest_name.trim();
  } else {
    name = questId.toString().replace(/_/g, ' ').replace(/-/g, ' ');
  }

  const taskConfig = quest.config?.task_config || (quest.config as any)?.task_config_v2;
  const tasks = taskConfig?.tasks;
  if (tasks && Object.keys(tasks).length > 0) {
    const taskName = [
      'WATCH_VIDEO',
      'PLAY_ON_DESKTOP',
      'STREAM_ON_DESKTOP',
      'PLAY_ACTIVITY',
      'WATCH_VIDEO_ON_MOBILE',
    ].find((x) => tasks[x as QuestTaskConfigType] != null) as QuestTaskConfigType;

    if (taskName && tasks[taskName]) {
      const target = tasks[taskName].target;
      const progress = quest.userStatus?.progress?.[taskName]?.value ?? 0;
      remaining = Math.max(0, target - progress);
    }
  } else {
    remaining = -1;
    reward = 'Unsupported';
  }

  const rewards = quest.config?.rewards_config?.rewards;
  if (rewards && rewards.length > 0) {
    if (rewards[0].messages?.name) {
      reward = rewards[0].messages.name;
    } else if (rewards[0].orb_quantity) {
      reward = `${rewards[0].orb_quantity} Orbs`;
    }
  }

  return { name, remaining, reward };
}
