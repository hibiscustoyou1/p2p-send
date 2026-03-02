import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TransferView from '../TransferView.vue';
import { signalingService } from '@/services/socket';
import { deviceManager } from '@/services/deviceManager';

// Mock dependencies
vi.mock('@/services/socket', () => ({
  signalingService: {
    connect: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    onPeerJoined: vi.fn(),
    onPeerLeft: vi.fn(),
    onAuthVerified: vi.fn((cb) => cb({ staticId: '100 001', myDeviceId: 'dev-1' })),
    offAuthVerified: vi.fn(),
    disconnect: vi.fn(),
    // 关键：需要同时模拟 peerStaticId 和 peerDeviceId
    // 这两个字段在 P2P 连接成功后决定了写入 trusted_devices 的设备 ID
    peerStaticId: null as string | null,
    peerDeviceId: null as string | null,
    roomId: null as string | null,
  },
  getMyDeviceId: vi.fn(() => 'dev-mock-id')
}));

vi.mock('@/services/deviceManager', () => ({
  deviceManager: {
    upsertDevice: vi.fn(),
  }
}));

vi.mock('@/services/webrtc', () => {
  // 保存事件回调，以便测试中手动触发 stateChange
  let stateChangeCallback: ((state: string) => void) | null = null;

  const MockWebRTCManager = class {
    on = vi.fn((event: string, cb: any) => {
      if (event === 'stateChange') {
        stateChangeCallback = cb;
      }
    });
    init = vi.fn();
    call = vi.fn();
    close = vi.fn();
    getChannel = vi.fn();
  };

  // 暴露触发器供测试使用
  (MockWebRTCManager as any).__triggerStateChange = (state: string) => {
    if (stateChangeCallback) stateChangeCallback(state);
  };

  return { WebRTCManager: MockWebRTCManager };
});

// 辅助：获取 WebRTCManager mock 的触发器
async function getWebRTCTrigger() {
  const { WebRTCManager } = await import('@/services/webrtc');
  return (WebRTCManager as any).__triggerStateChange as (state: string) => void;
}

describe('TransferView Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signalingService.connect).mockResolvedValue(undefined);
    vi.mocked(signalingService.joinRoom).mockResolvedValue({} as any);
    // 重置对端信息
    (signalingService as any).peerStaticId = null;
    (signalingService as any).peerDeviceId = null;
    (signalingService as any).roomId = null;
  });

  describe('套件 1: 初始化与断开状态渲染', () => {
    it('挂载后应自动获取身份为 sender，并建立连接，隐藏上传区', async () => {
      const wrapper = mount(TransferView, {
        global: {
          stubs: {
            ConnectionPanel: true,
            UploadZone: true,
            TransferList: true,
            TransferCard: true
          }
        }
      });

      // 等待内部 onMounted 的 await promise 流转
      await flushPromises();

      // 断言核心 Socket 发出
      expect(signalingService.connect).toHaveBeenCalled();
      expect(signalingService.joinRoom).toHaveBeenCalledWith(expect.any(String), 'sender');

      // 断言基于视图绑定
      expect(wrapper.findComponent({ name: 'ConnectionPanel' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'UploadZone' }).exists()).toBe(false);
      expect(wrapper.html()).not.toContain('与对端设备连接成功');
    });
  });

  describe('套件 2: 连接状态与身份响应机制', () => {
    it('面板抛出 @connect 后，视图应切换为 receiver 并重新触发加房流程', async () => {
      const wrapper = mount(TransferView, {
        global: {
          stubs: {
            ConnectionPanel: true,
            UploadZone: true,
            TransferList: true,
            TransferCard: true
          }
        }
      });
      await flushPromises();

      // 这里我们直接测试组件实例方法，以避开 stub 的事件捕获限制
      await (wrapper.vm as any).onConnect('123456');
      await flushPromises();

      // 断言调用了离房重新进入的操作
      expect(signalingService.leaveRoom).toHaveBeenCalled();
      expect(signalingService.joinRoom).toHaveBeenLastCalledWith('123456', 'receiver');

      // 验证 DOM 文字显示当前的状态为接收者且连线中
      expect(wrapper.html()).toContain('正在建立安全 P2P 隧道...');
      expect(wrapper.html()).toContain('Role: receiver');
    });
  });

  describe('套件 3: 核心通道通信与功能区映射', () => {
    it('当身份为 sender 且 WebRTC 建立连接后，应当显示 UploadZone 组件', async () => {
      const wrapper = mount(TransferView, {
        global: {
          stubs: { ConnectionPanel: true, UploadZone: true, TransferList: true, TransferCard: true }
        }
      });
      await flushPromises();

      (wrapper.vm as any).connectionStatus = 'connected';
      (wrapper.vm as any).currentRole = 'sender';
      await flushPromises();

      expect(wrapper.html()).toContain('与对端设备连接成功');
      expect(wrapper.html()).toContain('Role: sender');
      // sender 连接成功应该可以看到上传框
      expect(wrapper.findComponent({ name: 'UploadZone' }).exists()).toBe(true);
    });

    it('当身份为 receiver 且 WebRTC 建立连接后，隐藏 UploadZone 组件', async () => {
      const wrapper = mount(TransferView, {
        global: {
          stubs: { ConnectionPanel: true, UploadZone: true, TransferList: true, TransferCard: true }
        }
      });
      await flushPromises();

      (wrapper.vm as any).connectionStatus = 'connected';
      (wrapper.vm as any).currentRole = 'receiver';
      await flushPromises();

      // receiver 即便连接成功，它只是收东西，不能上传
      expect(wrapper.findComponent({ name: 'UploadZone' }).exists()).toBe(false);
    });
  });

  // ===================================================================
  // 【新增：核心回归测试套件 4】
  // 覆盖 P2P 连接成功后 trusted_devices 的 ID 正确性
  //
  // 这是之前测试的最大盲区：
  // 原有测试完全跳过了 WebRTC stateChange 回调，
  // 也没有断言 upsertDevice 被调用，更没有验证传入了什么 ID。
  // 正是这个漏洞导致"peerStaticId vs peerDeviceId"的 ID 不匹配 Bug
  // 在测试中完全透明，只有浏览器手工复现才能发现。
  // ===================================================================
  describe('套件 4: P2P 连接成功后设备 ID 持久化（核心回归）', () => {
    it('【关键】WebRTC 状态变为 connected 时，应以 peerDeviceId（UUID）而非 peerStaticId 写入 trusted_devices', async () => {
      // 预设对端信息——模拟 SignalingService 握手后的真实状态
      (signalingService as any).peerStaticId = '100 007';     // 静态短号（展示用）
      (signalingService as any).peerDeviceId = 'dev_abc123';  // UUID（唯一索引，必须用这个）

      const wrapper = mount(TransferView, {
        global: {
          stubs: { ConnectionPanel: true, UploadZone: true, TransferList: true, TransferCard: true }
        }
      });
      await flushPromises();

      // 通过 initWebRTCManager 绑定的 stateChange 回调，触发 'connected' 状态
      const trigger = await getWebRTCTrigger();
      trigger('connected');
      await flushPromises();

      // 【核心断言】必须调用 upsertDevice 且 id 字段是 UUID（而非静态短号）
      expect(deviceManager.upsertDevice).toHaveBeenCalledOnce();
      expect(deviceManager.upsertDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'dev_abc123', // ✅ UUID
        })
      );
      // 反向确认：绝不能用短号作为唯一键
      expect(deviceManager.upsertDevice).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: '100 007', // ❌ 静态短号
        })
      );
    });

    it('originalName 应使用可读的静态短号展示，而非 UUID', async () => {
      (signalingService as any).peerStaticId = '100 007';
      (signalingService as any).peerDeviceId = 'dev_abc123';

      const wrapper = mount(TransferView, {
        global: {
          stubs: { ConnectionPanel: true, UploadZone: true, TransferList: true, TransferCard: true }
        }
      });
      await flushPromises();

      const trigger = await getWebRTCTrigger();
      trigger('connected');
      await flushPromises();

      // originalName 应包含 peerStaticId（人类可读的展示名）
      expect(deviceManager.upsertDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: expect.stringContaining('100 007'),
        })
      );
    });

    it('若 peerDeviceId 为空（握手未完成），不应写入 trusted_devices', async () => {
      // 模拟握手未完成：peerDeviceId 为 null
      (signalingService as any).peerStaticId = '100 007';
      (signalingService as any).peerDeviceId = null; // ← 未获取到 UUID

      const wrapper = mount(TransferView, {
        global: {
          stubs: { ConnectionPanel: true, UploadZone: true, TransferList: true, TransferCard: true }
        }
      });
      await flushPromises();

      const trigger = await getWebRTCTrigger();
      trigger('connected');
      await flushPromises();

      // guard 条件应阻止写入，防止以 null 作为 ID 污染数据库
      expect(deviceManager.upsertDevice).not.toHaveBeenCalled();
    });
  });
});
