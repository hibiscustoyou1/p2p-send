// src/services/deviceManager.ts

export interface TrustedDevice {
  id: string; // 设备的唯一识别码 (长效指纹)
  alias?: string; // 用户可自定义的显示名称
  originalName: string; // 设备初遇时的真实名称
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'; // 设备类型标识
  addedAt: number; // 首次相遇/信任时间
  lastSeen: number; // 最后一次活跃心跳时间
}

const STORAGE_KEY = 'p2p_trusted_devices';

class DeviceManager {
  private getTrustedList(): TrustedDevice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as TrustedDevice[];
      }
    } catch (e) {
      console.error('[DeviceManager] 解析受信任设备列表失败:', e);
    }
    return [];
  }

  private saveTrustedList(list: TrustedDevice[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[DeviceManager] 存储受信任设备列表失败:', e);
    }
  }

  /**
   * 获取所有被信任保存的设备
   */
  public getAllDevices(): TrustedDevice[] {
    return this.getTrustedList().sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * 添加一个设备到信任列表，如果已存在则更新它
   */
  public upsertDevice(device: Omit<TrustedDevice, 'addedAt'>): TrustedDevice {
    const list = this.getTrustedList();
    const existingIndex = list.findIndex(d => d.id === device.id);
    const now = Date.now();

    let resultDevice: TrustedDevice;

    if (existingIndex > -1) {
      // 更新逻辑
      const existing = list[existingIndex]!;
      resultDevice = {
        ...existing,
        ...device,
        addedAt: existing.addedAt, // 保持初入时间的恒定
        lastSeen: Math.max(existing.lastSeen, now)
      };
      // 不破坏可能已设置的自定义 alias 除非未设置或者故意清空
      if (device.alias !== undefined) {
        resultDevice.alias = device.alias;
      }
      list[existingIndex] = resultDevice;
    } else {
      // 新增逻辑
      resultDevice = {
        ...device,
        addedAt: now,
        lastSeen: now,
      };
      list.push(resultDevice);
    }

    this.saveTrustedList(list);
    return resultDevice;
  }

  /**
   * 根据 ID 仅更新最后可见时间而不修改其它信息（保活脉冲）
   */
  public updateLastSeen(id: string): void {
    const list = this.getTrustedList();
    const device = list.find(d => d.id === id);
    if (device) {
      device.lastSeen = Date.now();
      this.saveTrustedList(list);
    }
  }

  /**
   * 移除某台受信任设备
   */
  public removeDevice(id: string): void {
    const list = this.getTrustedList();
    const filtered = list.filter(d => d.id !== id);
    this.saveTrustedList(filtered);
  }

  /**
   * 更新设备的备注名
   */
  public updateDeviceAlias(id: string, alias: string): boolean {
    const list = this.getTrustedList();
    const existing = list.find(d => d.id === id);
    if (existing) {
      existing.alias = alias;
      this.saveTrustedList(list);
      return true;
    }
    return false;
  }

  /**
   * 彻底清空所有受信任设备
   */
  public clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const deviceManager = new DeviceManager();
