import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TransferView from '../TransferView.vue';
import { signalingService } from '@/services/socket';

// Mock dependencies
vi.mock('@/services/socket', () => ({
  signalingService: {
    connect: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    onPeerJoined: vi.fn(),
    onPeerLeft: vi.fn(),
    disconnect: vi.fn(),
  }
}));

vi.mock('@/services/webrtc', () => {
  return {
    WebRTCManager: class {
      on = vi.fn();
      init = vi.fn();
      call = vi.fn();
      close = vi.fn();
      getChannel = vi.fn();
    }
  };
});

describe('TransferView Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signalingService.connect).mockResolvedValue(undefined);
    vi.mocked(signalingService.joinRoom).mockResolvedValue({} as any);
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

      // 这里直接获得 WebRTCManager 被构造后的 mock 实例中的 on 通道绑定
      // 由于通过 vi.mock 构造的是一个 class 拦截，我们需要提取 on 绑定的事件处理函数
      // 为了便于 TDD 我们这采取直接修改 vm 的响应式内部状态
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
});
