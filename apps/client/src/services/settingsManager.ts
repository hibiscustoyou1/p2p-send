/**
 * 设置管理器 (Settings Manager)
 * 
 * 职责：
 * 1. 负责前端全局偏好（主题风格、声音开关、自动接收等）的读取和落盘。
 * 2. 负责维护核心鉴权口令 `globalAccessToken`。此为单例护城河口令，
 *    只有提供合规串才配与服务器建立长连接并分配到专属 6 位固件码。
 */

// 设置属性结构定义
export interface AppSettings {
  // === 个性化显示 ===
  theme: 'light' | 'dark' | 'system';
  deviceName: string; // 自定义别名（默认按系统/浏览器填充，但用户可覆盖）
  // === 传输偏好 ===
  autoAccept: boolean;
  playSound: boolean;
  requirePin: boolean; // 若为 true，其他即使知道数字短号的内鬼想连接，也会在双端弹一个数字供校验确认
  // === 护城河口令 ===
  globalAccessToken: string;
}

const STORAGE_KEY = 'p2p_send_app_settings';

// 默认安全落盘状态
const defaultSettings: AppSettings = {
  theme: 'system',
  deviceName: `Device_${Math.random().toString(36).substring(2, 6)}`.toUpperCase(),
  autoAccept: false,
  playSound: true,
  requirePin: false,
  globalAccessToken: ''
};

class SettingsManager {
  private currentSettings: AppSettings;

  constructor() {
    this.currentSettings = this.loadFromStorage();
  }

  // 从离线缓存拉起
  private loadFromStorage(): AppSettings {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        return { ...defaultSettings, ...JSON.parse(storedData) };
      }
    } catch (err) {
      console.warn('读取配置失败:', err);
    }
    return { ...defaultSettings };
  }

  // 写入离线存盘
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
  }

  // ================ 暴露对外的同步 Getter/Setter ===================

  public getSettings(): AppSettings {
    return { ...this.currentSettings };
  }

  // 增量热更新某个特定设置块
  public updateSettings(partial: Partial<AppSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...partial };
    this.saveToStorage();
    this.applyThemeIfChanged(partial.theme);
  }

  // 获取访问私服使用的令牌锁
  public getAccessToken(): string {
    return this.currentSettings.globalAccessToken;
  }

  // 设置访问私服使用的令牌锁（免更新全状态）
  public setAccessToken(token: string): void {
    this.currentSettings.globalAccessToken = token;
    this.saveToStorage();
  }

  // 根据当前内存配置应用明暗主题到宿主文档 <html>
  public applyCurrentTheme() {
    this.applyThemeIfChanged(this.currentSettings.theme);
  }

  private applyThemeIfChanged(theme?: AppSettings['theme']) {
    if (!theme) return;

    const isDark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // 核心！恢复出厂模式
  public resetToDefaults(): void {
    // 除了 Token 等敏感存量，其他可重置
    const token = this.currentSettings.globalAccessToken;
    this.currentSettings = { ...defaultSettings, globalAccessToken: token };
    this.saveToStorage();
    this.applyCurrentTheme();
  }
}

export const settingsManager = new SettingsManager();
