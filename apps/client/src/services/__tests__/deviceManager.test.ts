import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { deviceManager } from '../deviceManager';

describe('deviceManager', () => {
  // 设置前置条件重置 LocalStorage
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Empty state', () => {
    it('should return an empty array if no devices added', () => {
      expect(deviceManager.getAllDevices()).toEqual([]);
    });
  });

  describe('Upsert operations', () => {
    it('should correctly insert a new trusted device', () => {
      const mockTime = 1600000000000;
      vi.setSystemTime(mockTime);

      const payload = {
        id: 'device-aaa',
        originalName: 'My Macbook Pro',
        deviceType: 'desktop' as const,
        lastSeen: mockTime
      };

      const result = deviceManager.upsertDevice(payload);

      expect(result.id).toBe('device-aaa');
      expect(result.addedAt).toBe(mockTime);
      expect(result.lastSeen).toBe(mockTime);

      const all = deviceManager.getAllDevices();
      expect(all.length).toBe(1);
      expect(all[0]!.id).toBe('device-aaa');
    });

    it('should update existing device without changing addedAt but merge other fields', () => {
      // 第一天加入
      vi.setSystemTime(1000000);
      deviceManager.upsertDevice({
        id: 'device-bbb',
        originalName: 'iPhone 13',
        alias: '我的手机',
        deviceType: 'mobile',
        lastSeen: 1000000
      });

      // 第二天遇到，更新状态
      vi.setSystemTime(2000000);
      const updated = deviceManager.upsertDevice({
        id: 'device-bbb',
        originalName: 'iPhone 13 Pro', // 被修改过的设备名字
        deviceType: 'mobile',
        lastSeen: 2000000
      });

      expect(updated.addedAt).toBe(1000000); // 应该保留最初加入的时间
      expect(updated.lastSeen).toBe(2000000); // 最后可见时间提升
      expect(updated.originalName).toBe('iPhone 13 Pro'); // 更新了真实名
      expect(updated.alias).toBe('我的手机'); // 这里没传 alias 应该保留原状
    });
  });

  describe('Modify & Retrieve Operations', () => {
    beforeEach(() => {
      vi.setSystemTime(1000);
      deviceManager.upsertDevice({
        id: 'dev-1',
        originalName: 'Device 1',
        deviceType: 'desktop',
        lastSeen: 1000
      });
      vi.setSystemTime(2000);
      deviceManager.upsertDevice({
        id: 'dev-2',
        originalName: 'Device 2',
        deviceType: 'mobile',
        lastSeen: 2000
      });
    });

    it('should retrieve devices sorted by lastSeen desc', () => {
      const all = deviceManager.getAllDevices();
      expect(all.length).toBe(2);
      expect(all[0]!.id).toBe('dev-2'); // 2000 is larger than 1000
      expect(all[1]!.id).toBe('dev-1');
    });

    it('should update alias correctly', () => {
      const success = deviceManager.updateDeviceAlias('dev-1', 'Super Computer');
      expect(success).toBe(true);

      const all = deviceManager.getAllDevices();
      const target = all.find(x => x.id === 'dev-1');
      expect(target?.alias).toBe('Super Computer');
    });

    it('should return false if trying to update unexisting device alias', () => {
      const success = deviceManager.updateDeviceAlias('dev-not-exist', 'Invalid');
      expect(success).toBe(false);
    });

    it('should update last seen specifically via ping', () => {
      vi.setSystemTime(5000);
      deviceManager.updateLastSeen('dev-1');

      // 更新后，dev-1 (5000) 将排在 dev-2 (2000) 之前
      const all = deviceManager.getAllDevices();
      expect(all[0]!.id).toBe('dev-1');
      expect(all[0]!.lastSeen).toBe(5000);
      expect(all[1]!.id).toBe('dev-2');
    });

    it('should remove target device successfully', () => {
      deviceManager.removeDevice('dev-1');
      const all = deviceManager.getAllDevices();
      expect(all.length).toBe(1);
      expect(all[0]!.id).toBe('dev-2');
    });

    it('should clear all devices', () => {
      deviceManager.clearAll();
      expect(deviceManager.getAllDevices()).toEqual([]);
    });
  });
});
