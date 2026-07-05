import { Client, type APIGatewayBotInfo } from '@discordjs/core';
import { REST, DefaultRestOptions, type ResponseLike } from '@discordjs/rest';
import { WebSocketManager, WebSocketShard } from '@discordjs/ws';
import { type GatewaySendPayload, GatewayOpcodes } from 'discord-api-types/v9';
import type { RequestInit } from 'undici';
import { decorateHeaders, type AntiDetectSession } from '../core/anti-detect';
import { createSession } from '../core/anti-detect';
import type { AllQuestsResponse } from '../types/index';
import { QuestManager } from './quest-manager';
import { patchWebSocket, proxyRequest } from '../utils/proxy';

// Kích hoạt monkey patch WebSocket ngay lập tức để chặn các kết nối của discordjs/ws
patchWebSocket();

const sessionRegistry = new Map<string, AntiDetectSession>();

let identifyPatched = false;
function patchIdentify() {
  if (identifyPatched) return;
  identifyPatched = true;

  const originalSend = WebSocketShard.prototype.send;
  WebSocketShard.prototype.send = async function (
    this: any,
    payload: GatewaySendPayload,
  ) {
    if (payload.op === GatewayOpcodes.Identify) {
      const token = this.strategy?.options?.token;
      const session = sessionRegistry.get(token);
      if (session) {
        payload.d = {
          token: payload.d.token,
          properties: {
            ...session.profile,
            is_fast_connect: false,
            gateway_connect_reasons: 'AppSkeleton',
          },
          capabilities: 0,
          presence: payload.d.presence,
          compress: payload.d.compress,
          client_state: { guild_versions: {} },
        } as any;
      }
    }
    return originalSend.call(this, payload);
  };
}

/**
 * Wraps a single Discord user connection with anti-detection.
 * Manages WebSocket lifecycle and REST API calls for quest operations.
 */
export class DiscordClient {
  public readonly client: Client;
  public readonly rest: REST;
  public readonly gateway: WebSocketManager;
  public readonly session: AntiDetectSession;
  public questManager: QuestManager | null = null;

  constructor(
    public readonly token: string,
    public readonly proxy?: string,
  ) {
    this.session = createSession();

    // Wrap `makeRequest` with anti-detect headers & proxy if configured
    const makeRequest = (url: string, init: RequestInit): Promise<ResponseLike> => {
      const secured = decorateHeaders(init, this.session);
      if (this.proxy) {
        return proxyRequest(url, secured, this.proxy);
      }
      return DefaultRestOptions.makeRequest(url, secured);
    };

    this.rest = new REST({ version: '10', makeRequest }).setToken(token);
    this.gateway = new WebSocketManager({ token, intents: 0, rest: this.rest });

    // Override gateway info fetch to force a specific gateway URL & embed proxy if present
    this.gateway.fetchGatewayInformation = (
      _force?: boolean,
    ): Promise<APIGatewayBotInfo> => {
      let gatewayUrl = 'wss://gateway.discord.gg';
      if (this.proxy) {
        gatewayUrl += `?_proxy=${encodeURIComponent(this.proxy)}`;
      }
      return Promise.resolve({
        url: gatewayUrl,
        shards: 1,
        session_start_limit: {
          total: 1000,
          remaining: 1000,
          reset_after: 14400000,
          max_concurrency: 1,
        },
      });
    };

    // Store session in registry for WebSocketShard lookup
    sessionRegistry.set(token, this.session);

    // Patch identify payload to use our session profile
    patchIdentify();

    this.client = new Client({ rest: this.rest, gateway: this.gateway });
  }

  /** Connect to Discord gateway */
  async connect(): Promise<void> {
    await this.gateway.connect();
  }

  /** Disconnect from gateway */
  async disconnect(): Promise<void> {
    try {
      await this.gateway.destroy({ code: 1000, reason: 'Shutdown' });
    } catch {
      // Ignore disconnect errors
    }
  }

  /** Fetch quests from Discord API */
  async fetchQuests(): Promise<QuestManager> {
    const response = (await this.rest.get('/quests/@me')) as AllQuestsResponse;
    this.questManager = QuestManager.fromResponse(response);
    return this.questManager;
  }
}
