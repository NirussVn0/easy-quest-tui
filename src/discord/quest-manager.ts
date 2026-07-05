import type { REST } from '@discordjs/rest';
import type {
  AllQuestsResponse,
  Quest as QuestShape,
  QuestTaskType,
  QuestTask,
  QuestUserStatus,
  QuestProgress,
} from '../types/index';
import { findSupportedTask, getQuestData } from '../utils/helpers';
import { sleep, randInt } from '../utils/random';
import { watchTickSleep, heartbeatSleep } from '../core/anti-detect';

// ─── Quest Entity ─────────────────────────────────────────────────────────────

export class Quest {
  private data: QuestShape;

  private constructor(data: QuestShape) {
    this.data = {
      ...data,
      user_status: data.user_status
        ? { ...data.user_status, progress: { ...data.user_status.progress } }
        : null,
    };
  }

  static create(data: QuestShape): Quest {
    return new Quest(data);
  }

  /** Expose raw data for helpers/display */
  get raw(): QuestShape {
    return this.data;
  }
  get id(): string {
    return this.data.id;
  }
  get config(): QuestShape['config'] {
    return this.data.config;
  }
  get userStatus(): QuestShape['user_status'] {
    return this.data.user_status;
  }
  get targetedContent(): number {
    return this.data.targeted_content;
  }
  get preview(): boolean {
    return this.data.preview;
  }

  isExpired(ref: Date = new Date()): boolean {
    return ref.getTime() > new Date(this.data.config?.expires_at ?? 0).getTime();
  }

  isCompleted(): boolean {
    return Boolean(this.userStatus?.completed_at);
  }
  isEnrolled(): boolean {
    return Boolean(this.userStatus?.enrolled_at);
  }
  hasClaimedRewards(): boolean {
    return Boolean(this.userStatus?.claimed_at);
  }

  updateUserStatus(status: QuestShape['user_status']): void {
    this.data.user_status = status;
  }
}

// ─── Quest Manager ────────────────────────────────────────────────────────────

export class QuestManager implements Iterable<Quest> {
  private readonly quests = new Map<string, Quest>();

  private constructor(quests: Quest[] = []) {
    quests.forEach((q) => this.quests.set(q.id, q));
  }

  static fromResponse(response: AllQuestsResponse): QuestManager {
    return new QuestManager(response.quests.map(Quest.create));
  }

  [Symbol.iterator](): IterableIterator<Quest> {
    return this.quests.values();
  }

  get size(): number {
    return this.quests.size;
  }

  list(): Quest[] {
    return Array.from(this.quests.values());
  }

  get(id: string): Quest | undefined {
    return this.quests.get(id);
  }

  /** Get quests that are valid to farm: not completed, not expired, not excluded */
  getFarmeable(): Quest[] {
    return this.list().filter(
      (q) => q.id !== '1412491570820812933' && !q.isCompleted() && !q.isExpired(),
    );
  }

  /** Get all valid quests with their display data */
  getValidProgress(): QuestProgress[] {
    const result: (QuestProgress | null)[] = this.getFarmeable().map((quest) => {
      const data = getQuestData(quest.raw);
      if (data.remaining === -1) return null;
      return {
        id: quest.id,
        name: data.name,
        reward: data.reward,
        remaining: data.remaining,
        total: data.total,
        status: 'pending' as QuestProgress['status'],
      };
    });
    return result.filter((p): p is QuestProgress => p !== null);
  }
}

// ─── Quest Executor (processes a single quest with anti-detect) ──────────────

export type QuestResult = 'completed' | 'error' | 'unsupported';

interface ExecutorDeps {
  rest: REST;
  quest: Quest;
  onProgress?: (remaining: number) => void;
  isAborted?: () => boolean;
}

/**
 * Execute a single quest from enrollment through completion.
 * Each step includes anti-detection randomisation.
 */
export async function executeQuest(deps: ExecutorDeps): Promise<QuestResult> {
  const { rest, quest, isAborted } = deps;

  try {
    // 1. Enroll if not already enrolled
    if (!quest.isEnrolled()) {
      if (isAborted?.()) return 'error';
      await enrollQuest(rest, quest.id);
    }

    // 2. Detect task type
    const taskConfig = (quest.config?.task_config ?? (quest.config as any)?.task_config_v2) as
      | { tasks?: Partial<Record<QuestTaskType, QuestTask>> }
      | undefined;

    const taskType = findSupportedTask(taskConfig?.tasks);
    if (!taskType || !taskConfig?.tasks?.[taskType]) {
      return 'unsupported';
    }

    const target = taskConfig.tasks[taskType]!.target;

    // 3. Execute based on task type
    switch (taskType) {
      case 'WATCH_VIDEO':
      case 'WATCH_VIDEO_ON_MOBILE':
        return executeWatchTask(deps, target, taskType);
      case 'PLAY_ON_DESKTOP':
      case 'STREAM_ON_DESKTOP':
      case 'PLAY_ACTIVITY':
        return executeHeartbeatTask(deps, taskType);
      default:
        return 'unsupported';
    }
  } catch {
    return 'error';
  }
}

// ─── Task Implementations ─────────────────────────────────────────────────────

async function executeWatchTask(
  deps: ExecutorDeps,
  secondsNeeded: number,
  taskType: QuestTaskType,
): Promise<QuestResult> {
  const { rest, quest, onProgress, isAborted } = deps;
  const progress = quest.userStatus?.progress?.[taskType]?.value ?? 0;
  let secondsDone = progress;

  // Natural pacing: vary speed per tick
  while (secondsDone < secondsNeeded) {
    if (isAborted?.()) return 'error';
    // Speed varies 4-9 per tick to look human
    const speed = randInt(4, 9);

    // Use the real enrolled_at as a base (anti-cheat)
    const enrolledAt = new Date(quest.userStatus?.enrolled_at ?? Date.now()).getTime();
    const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + 10;

    const diff = maxAllowed - secondsDone;
    if (diff >= speed) {
      const timestamp = Math.min(secondsNeeded, secondsDone + speed);
      const res = (await rest.post(`/quests/${quest.id}/video-progress`, {
        body: { timestamp: timestamp + Math.random() * 0.5 },
      })) as any;

      if (res.completed_at != null) break;
      secondsDone = timestamp;
      onProgress?.(Math.max(0, secondsNeeded - secondsDone));
    }

    await watchTickSleep();
  }

  // Final completion tick
  if (secondsDone < secondsNeeded) {
    if (isAborted?.()) return 'error';
    await rest.post(`/quests/${quest.id}/video-progress`, {
      body: { timestamp: secondsNeeded },
    });
  }

  onProgress?.(0);
  return 'completed';
}

async function executeHeartbeatTask(
  deps: ExecutorDeps,
  taskType: QuestTaskType,
): Promise<QuestResult> {
  const { rest, quest, onProgress, isAborted } = deps;
  // Heartbeat interval varies by task type + jitter
  const baseInterval = taskType === 'PLAY_ON_DESKTOP' ? 30 : 20;

  while (!quest.isCompleted()) {
    if (isAborted?.()) return 'error';
    const body: Record<string, unknown> = { terminal: false };
    if (taskType === 'STREAM_ON_DESKTOP' || taskType === 'PLAY_ACTIVITY') {
      body.stream_key = 'call:0:1';
    } else {
      body.application_id = quest.config?.application?.id;
    }

    const res = await rest.post(`/quests/${quest.id}/heartbeat`, { body });
    quest.updateUserStatus(res as QuestUserStatus);
    onProgress?.(0);

    if (quest.isCompleted()) break;
    await heartbeatSleep(baseInterval);
  }

  // Terminal heartbeat
  if (isAborted?.()) return 'error';
  const terminalBody: Record<string, unknown> = { terminal: true };
  if (taskType === 'STREAM_ON_DESKTOP' || taskType === 'PLAY_ACTIVITY') {
    terminalBody.stream_key = 'call:0:1';
  } else {
    terminalBody.application_id = quest.config?.application?.id;
  }

  await rest.post(`/quests/${quest.id}/heartbeat`, { body: terminalBody });
  onProgress?.(0);
  return 'completed';
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

async function enrollQuest(rest: REST, questId: string): Promise<void> {
  await sleep(randInt(500, 2000)); // Random delay before enrolling
  await rest.post(`/quests/${questId}/enroll`, {
    body: { location: 11, is_targeted: false, metadata_raw: null },
  });
}
