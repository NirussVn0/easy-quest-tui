import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import ws from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { RequestInit } from 'undici';
import type { ResponseLike } from '@discordjs/rest';

/** Create a standard Node.js Agent for HTTP/SOCKS proxies */
export function createProxyAgent(proxyUrl: string): https.Agent | http.Agent {
  if (proxyUrl.startsWith('socks')) {
    return new SocksProxyAgent(proxyUrl);
  }
  return new HttpsProxyAgent(proxyUrl);
}

/**
 * Executes an HTTP/HTTPS request through a proxy, returning a Fetch-like Response object.
 * This is used to intercept undici/fetch requests in the REST client.
 */
export async function proxyRequest(
  urlStr: string,
  init: RequestInit,
  proxyUrl: string,
): Promise<ResponseLike> {
  const agent = createProxyAgent(proxyUrl);

  return new Promise((resolve, reject) => {
    const isHttps = urlStr.startsWith('https:');

    // Parse undici Headers into standard record
    const headers: Record<string, string> = {};
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((val, key) => {
          headers[key] = val;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, val] of init.headers) {
          headers[key] = val;
        }
      } else {
        Object.assign(headers, init.headers);
      }
    }

    const reqOptions: http.RequestOptions = {
      method: init.method || 'GET',
      headers,
      agent: agent as any,
      signal: init.signal || undefined,
    };

    const client = isHttps ? https : http;
    const req = client.request(urlStr, reqOptions, (res) => {
      // Handle compression / decompression
      let responseStream: NodeJS.ReadableStream = res;
      const contentEncoding = res.headers['content-encoding'];

      if (contentEncoding === 'gzip') {
        responseStream = res.pipe(zlib.createGunzip());
      } else if (contentEncoding === 'deflate') {
        responseStream = res.pipe(zlib.createInflate());
      } else if (contentEncoding === 'br') {
        responseStream = res.pipe(zlib.createBrotliDecompress());
      }

      // Construct a Fetch Response using global Response class
      const response = new Response(responseStream as any, {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers as Record<string, string>,
      });

      resolve(response as unknown as ResponseLike);
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (init.body) {
      if (typeof init.body === 'string' || Buffer.isBuffer(init.body)) {
        req.write(init.body);
        req.end();
      } else if (typeof (init.body as any).pipe === 'function') {
        (init.body as any).pipe(req);
      } else {
        req.write(init.body);
        req.end();
      }
    } else {
      req.end();
    }
  });
}

/**
 * Monkey-patches ws.WebSocket and globalThis.WebSocket to intercept and
 * apply proxy agent when the URL has the `_proxy` query parameter.
 */
let patched = false;
export function patchWebSocket(): void {
  if (patched) return;
  patched = true;

  const patch = (WSClass: any) => {
    if (!WSClass || WSClass.__patched) return WSClass;

    const Wrapper = function (
      this: any,
      address: string,
      protocols?: string | string[],
      options?: any,
    ) {
      let cleanAddress = address;
      let agent: any = undefined;

      try {
        const urlObj = new URL(address);
        const proxyVal = urlObj.searchParams.get('_proxy');
        if (proxyVal) {
          agent = createProxyAgent(proxyVal);
          urlObj.searchParams.delete('_proxy');
          cleanAddress = urlObj.toString();
        }
      } catch {
        // Fallback for invalid URLs
      }

      const wsOptions = {
        ...options,
        ...(agent ? { agent } : {}),
      };

      // Construct the original class instance
      return Reflect.construct(
        WSClass,
        [cleanAddress, protocols, wsOptions],
        new.target || Wrapper,
      );
    };

    Object.setPrototypeOf(Wrapper, WSClass);
    Wrapper.prototype = WSClass.prototype;
    (Wrapper as any).__patched = true;
    return Wrapper;
  };

  const wsLib = ws as any;
  if (wsLib.WebSocket) {
    wsLib.WebSocket = patch(wsLib.WebSocket);
  }
  if (wsLib.default && wsLib.default.WebSocket) {
    wsLib.default.WebSocket = patch(wsLib.default.WebSocket);
  }
  if (globalThis.WebSocket) {
    globalThis.WebSocket = patch(globalThis.WebSocket) as any;
  }
}
