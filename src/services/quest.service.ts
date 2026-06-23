import { ClientQuest } from './api.service';
import type {
  AllQuestsResponse,
  QuestTaskConfigType,
  Quest as QuestShape,
} from '../types/quest.types';

export class Quest {
  private readonly data: QuestShape;

  private constructor(data: QuestShape) {
    this.data = data;
  }

  static create(data: QuestShape): Quest {
    return new Quest(data);
  }

  get id() {
    return this.data.id;
  }

  get config() {
    return this.data.config;
  }

  get userStatus() {
    return this.data.user_status;
  }

  get targetedContent() {
    return this.data.targeted_content;
  }

  get preview(): boolean {
    return this.data.preview;
  }

  isExpired(reference: Date = new Date()): boolean {
    return reference.getTime() > new Date(this.data.config?.expires_at || 0).getTime();
  }

  isCompleted(): boolean {
    return Boolean(this.userStatus?.completed_at);
  }

  isEnrolledQuest(): boolean {
    return Boolean(this.userStatus?.enrolled_at);
  }

  hasClaimedRewards(): boolean {
    return Boolean(this.userStatus?.claimed_at);
  }

  updateUserStatus(userStatus: QuestShape['user_status']) {
    this.data.user_status = userStatus;
  }
}

export class QuestManager implements Iterable<Quest> {
  private readonly quests = new Map<string, Quest>();
  public readonly client: ClientQuest;
  constructor(client: ClientQuest, quests: Quest[] = []) {
    this.client = client;
    quests.forEach((quest) => this.quests.set(quest.id, quest));
  }

  static fromResponse(client: ClientQuest, response: AllQuestsResponse): QuestManager {
    return new QuestManager(
      client,
      response.quests.map((quest) => Quest.create(quest)),
    );
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

  upsert(quest: Quest): void {
    this.quests.set(quest.id, quest);
  }

  remove(id: string): boolean {
    return this.quests.delete(id);
  }

  clear(): void {
    this.quests.clear();
  }

  getExpired(date: Date = new Date()): Quest[] {
    return this.list().filter((quest) => quest.isExpired(date));
  }

  getCompleted(): Quest[] {
    return this.list().filter((quest) => quest.isCompleted());
  }

  getClaimable(): Quest[] {
    return this.list().filter(
      (quest) => quest.isCompleted() && !quest.hasClaimedRewards(),
    );
  }

  hasQuest(id: string): boolean {
    return this.quests.has(id);
  }

  filterQuestsValid() {
    return this.list().filter(
      (quest) =>
        quest.id !== '1412491570820812933' && !quest.isCompleted() && !quest.isExpired(),
    );
  }

  getApplicationData(ids: string[]) {
    const query = new URLSearchParams();
    ids.forEach((id) => query.append('application_ids', id));
    return this.client.rest.get(`/applications/public`, {
      query,
    }) as Promise<
      {
        id: string;
        name: string;
        icon: string;
        description: string;
        executables: {
          os: string;
          name: string;
          is_launcher: boolean;
        }[];
      }[]
    >;
  }

  acceptQuest(questId: string) {
    return this.client.rest
      .post(`/quests/${questId}/enroll`, {
        body: {
          location: 11,
          is_targeted: false,
          metadata_raw: null,
        },
      })
      .then((r) => {
        const quest = this.get(questId);
        quest?.updateUserStatus(r as any);
        return quest;
      });
  }

  private async timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async doingQuest(quest: Quest) {
    if (!quest.isEnrolledQuest()) {
      await this.acceptQuest(quest.id);
    }

    const taskConfig = quest.config?.task_config || (quest.config as any)?.task_config_v2;

    if (!taskConfig?.tasks || Object.keys(taskConfig.tasks).length === 0) {
      throw new Error('Unsupported Task');
    }

    const taskName = [
      'WATCH_VIDEO',
      'PLAY_ON_DESKTOP',
      'STREAM_ON_DESKTOP',
      'PLAY_ACTIVITY',
      'WATCH_VIDEO_ON_MOBILE',
    ].find(
      (x) => taskConfig.tasks[x as QuestTaskConfigType] != null,
    ) as QuestTaskConfigType;

    if (!taskName || !taskConfig.tasks[taskName]) {
      throw new Error('Unsupported Task');
    }

    const secondsNeeded = taskConfig.tasks[taskName].target;
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

    if (taskName === 'WATCH_VIDEO' || taskName === 'WATCH_VIDEO_ON_MOBILE') {
      const maxFuture = 10,
        speed = 7,
        interval = 1;
      const enrolledAt = new Date(quest.userStatus?.enrolled_at as any).getTime();
      let completed = false;

      while (true) {
        const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
        const diff = maxAllowed - secondsDone;
        const timestamp = secondsDone + speed;
        if (diff >= speed) {
          const res = (await this.client.rest.post(`/quests/${quest.id}/video-progress`, {
            body: {
              timestamp: Math.min(secondsNeeded, timestamp + Math.random()),
            },
          })) as any;
          completed = res.completed_at != null;
          secondsDone = Math.min(secondsNeeded, timestamp);
        }

        if (timestamp >= secondsNeeded) {
          break;
        }
        await this.timeout(interval * 1000);
      }
      if (!completed) {
        await this.client.rest.post(`/quests/${quest.id}/video-progress`, {
          body: { timestamp: secondsNeeded },
        });
      }
      return 'Completed';
    } else if (
      taskName === 'PLAY_ON_DESKTOP' ||
      taskName === 'STREAM_ON_DESKTOP' ||
      taskName === 'PLAY_ACTIVITY'
    ) {
      const interval = taskName === 'PLAY_ON_DESKTOP' ? 30 : 20;
      while (!quest.isCompleted()) {
        const body: any = {
          terminal: false,
        };
        if (taskName === 'STREAM_ON_DESKTOP' || taskName === 'PLAY_ACTIVITY') {
          body.stream_key = `call:0:1`;
        } else {
          body.application_id = quest.config?.application?.id;
        }

        const res = await this.client.rest.post(`/quests/${quest.id}/heartbeat`, {
          body,
        });
        quest.updateUserStatus(res as any);
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      }

      const terminalBody: any = {
        terminal: true,
      };
      if (taskName === 'STREAM_ON_DESKTOP' || taskName === 'PLAY_ACTIVITY') {
        terminalBody.stream_key = `call:0:1`;
      } else {
        terminalBody.application_id = quest.config?.application?.id;
      }

      const res = await this.client.rest.post(`/quests/${quest.id}/heartbeat`, {
        body: terminalBody,
      });
      quest.updateUserStatus(res as any);
      return 'Completed';
    } else {
      throw new Error(`Unknown task type: ${taskName}. Use Discord desktop app.`);
    }
  }
}
