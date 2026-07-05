import EventEmitter from 'node:events';
import { GatewayDispatchEvents } from 'discord-api-types/v9';
import type { AccountState } from '../types/index';
import type { AccountConfig } from '../config/env';
import { DiscordClient } from '../discord/client';
import { executeQuest } from '../discord/quest-manager';
import { maskToken, maskProxy } from '../utils/helpers';
import { startupStagger } from './anti-detect';

export interface OrchestratorEvents {
  update: (accounts: AccountState[]) => void;
  done: (accounts: AccountState[]) => void;
  error: (error: Error) => void;
}

/**
 * Coordinates multiple Discord accounts for concurrent quest farming.
 * Each account runs independently with its own anti-detect session.
 */
export class Orchestrator extends EventEmitter {
  private accounts: AccountState[] = [];
  private aborted = false;
  private activeClients: DiscordClient[] = [];

  constructor(private readonly accountsConfig: AccountConfig[]) {
    super();
  }

  /** Total number of accounts being farmed */
  get totalAccounts(): number {
    return this.accountsConfig.length;
  }

  /** Start farming with all accounts concurrently */
  async start(): Promise<void> {
    this.accounts = this.accountsConfig.map((acc, index) => ({
      index,
      tokenPreview: maskToken(acc.token),
      username: 'Connecting...',
      userId: '-',
      status: 'initializing',
      quests: [],
      startedAt: new Date(),
      completedCount: 0,
      failedCount: 0,
      proxy: acc.proxy ? maskProxy(acc.proxy) : 'none',
    }));
    this.emitUpdate();

    const farmPromises = this.accounts.map((_, i) => this.farmAccount(i));

    await Promise.allSettled(farmPromises);

    if (!this.aborted) {
      this.emit('done', this.accounts);
    }
  }

  /** Stop all farming activity and disconnect active clients */
  abort(): void {
    this.aborted = true;
    for (const client of this.activeClients) {
      client.disconnect().catch(() => {});
    }
    this.activeClients = [];
  }

  private async farmAccount(index: number): Promise<void> {
    if (this.aborted) return;

    const account = this.accounts[index]!;
    const accConfig = this.accountsConfig[index]!;
    let client: DiscordClient | undefined;

    try {
      // Stagger startup to avoid mass-connect detection
      await startupStagger();

      // ── Phase 1: Connect ──────────────────────────────────────────────
      account.status = 'connecting';
      account.errorMessage = undefined;
      this.emitUpdate();

      client = new DiscordClient(accConfig.token, accConfig.proxy);
      this.activeClients.push(client);
      let isReady = false;

      client.gateway.on('error', ({ error }) => {
        account.status = 'error';
        account.errorMessage = `Gateway: ${error.message}`;
        this.emitUpdate();
      });

      client.gateway.on('closed', ({ code }) => {
        if (!isReady) {
          account.status = 'error';
          account.errorMessage = `Gateway closed (code ${code})`;
          this.emitUpdate();
        }
      });

      // Wait for Ready event
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Gateway timeout')), 30_000);

        client!.client.once(
          GatewayDispatchEvents.Ready,
          ({ data }: { data: { user: { username: string; id: string } } }) => {
            clearTimeout(timeout);
            isReady = true;
            account.username = data.user.username;
            account.userId = data.user.id;
            account.errorMessage = undefined;
            resolve();
          },
        );

        client!.client.once(GatewayDispatchEvents.Resumed, () => {
          isReady = true;
          account.errorMessage = undefined;
        });

        client!.connect().catch(reject);
      });

      // ── Phase 2: Fetch Quests ─────────────────────────────────────────
      account.status = 'fetching_quests';
      account.errorMessage = undefined;
      this.emitUpdate();

      const manager = client.questManager ?? (await client.fetchQuests());
      const questsProgress = manager.getValidProgress();

      if (questsProgress.length === 0) {
        account.status = 'completed';
        account.errorMessage = undefined;
        this.emitUpdate();
        return;
      }

      account.quests = questsProgress.map((qp) => ({ ...qp }));
      account.status = 'farming';
      account.errorMessage = undefined;
      this.emitUpdate();

      // ── Phase 3: Execute Quests Concurrently ──────────────────────────
      for (const qp of account.quests) {
        if (this.aborted) break;

        const quest = manager.get(qp.id);
        if (!quest) continue;

        qp.status = 'running';
        this.emitUpdate();

        const result = await executeQuest({
          rest: client.rest,
          quest,
          onProgress: (remaining) => {
            qp.remaining = remaining;
            this.emitUpdate();
          },
          isAborted: () => this.aborted,
        });

        if (result === 'completed') {
          qp.status = 'done';
          qp.remaining = 0;
          account.completedCount++;
        } else if (result === 'unsupported') {
          qp.status = 'error';
          qp.errorMessage = 'Unsupported task';
          account.failedCount++;
        } else {
          qp.status = 'error';
          qp.errorMessage = 'Execution failed';
          account.failedCount++;
        }
        this.emitUpdate();
      }

      // ── Phase 4: Cleanup ──────────────────────────────────────────────
      account.status = 'completed';
      account.errorMessage = undefined;
      this.emitUpdate();
    } catch (error) {
      account.status = 'error';
      account.errorMessage = error instanceof Error ? error.message : String(error);
      this.emitUpdate();
    } finally {
      if (client) {
        this.activeClients = this.activeClients.filter((c) => c !== client);
        await client.disconnect().catch(() => {});
      }
    }
  }

  private emitUpdate(): void {
    this.emit('update', [...this.accounts]);
  }
}
