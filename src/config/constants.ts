import { randomUUID } from 'node:crypto';

/**
 * Rotating list of realistic Discord client properties for anti-detection.
 * Each account picks one randomly to reduce fingerprint correlation.
 */
export const CLIENT_PROFILES = [
  {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'stable',
    client_version: '1.0.9215',
    os_version: '10.0.19045',
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'en-US',
    browser_user_agent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9215 Chrome/138.0.7204.251 Electron/37.6.0 Safari/537.36',
    browser_version: '37.6.0',
    os_sdk_version: '19045',
    client_build_number: 371091,
    native_build_number: 72186,
  },
  {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'ptb',
    client_version: '1.0.9216',
    os_version: '10.0.22621',
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'en-GB',
    browser_user_agent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9216 Chrome/138.0.7204.321 Electron/37.6.0 Safari/537.36',
    browser_version: '37.6.0',
    os_sdk_version: '22621',
    client_build_number: 372045,
    native_build_number: 72201,
  },
  {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'stable',
    client_version: '1.0.9214',
    os_version: '10.0.19045',
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'ja',
    browser_user_agent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9214 Chrome/137.0.7204.188 Electron/37.5.0 Safari/537.36',
    browser_version: '37.5.0',
    os_sdk_version: '19045',
    client_build_number: 370128,
    native_build_number: 72145,
  },
];

export type ClientProfile = (typeof CLIENT_PROFILES)[number];

/** Rotating user-agent list for HTTP requests */
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9215 Chrome/138.0.7204.251 Electron/37.6.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9216 Chrome/138.0.7204.321 Electron/37.6.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9214 Chrome/137.0.7204.188 Electron/37.5.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9215 Chrome/138.0.7204.251 Electron/37.6.0 Safari/537.36',
];

/** Rotating locale/language list */
export const LOCALES = ['en-US', 'en-GB', 'ja', 'vi', 'ko', 'zh-CN', 'fr', 'de', 'es'];

/** Rotating timezones */
export const TIMEZONES = [
  'Asia/Saigon',
  'Asia/Tokyo',
  'America/New_York',
  'Europe/London',
  'Asia/Seoul',
  'Australia/Sydney',
  'Europe/Berlin',
];

/** Build client properties from a randomly selected profile */
export function buildProperties(profile: ClientProfile) {
  return {
    ...profile,
    has_client_mods: false,
    client_launch_id: randomUUID(),
    client_event_source: null,
    launch_signature: randomUUID(),
    client_heartbeat_session_id: randomUUID(),
    client_app_state: 'focused',
  };
}
