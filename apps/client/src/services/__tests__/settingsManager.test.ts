import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsManager } from '../settingsManager';

describe('SettingsManager - Safe Storage & Flow', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    localStorage.clear();
    settingsManager.resetToDefaults();
  });

  it('[TDD] should securely save and retrieve global accessToken', () => {
    const rawVal = 'secure-token-x1x';
    settingsManager.setAccessToken(rawVal);

    expect(settingsManager.getAccessToken()).toBe(rawVal);
    // 也能通过全量读取校验
    expect(settingsManager.getSettings().globalAccessToken).toBe(rawVal);

    // 反向验证它确实存在于 LocalStorage
    const stored = JSON.parse(localStorage.getItem('p2p_send_app_settings') || '{}');
    expect(stored.globalAccessToken).toBe(rawVal);
  });

  it('[TDD] should preserve token during partial updates', () => {
    settingsManager.setAccessToken('my-token');

    // 我们仅部分更新一项主题配置
    settingsManager.updateSettings({ theme: 'dark' });

    expect(settingsManager.getAccessToken()).toBe('my-token');
    expect(settingsManager.getSettings().theme).toBe('dark');
  });
});
