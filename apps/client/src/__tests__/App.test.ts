import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import App from '../App.vue';
import { signalingService } from '@/services/socket';
import { settingsManager } from '@/services/settingsManager';

// Mock dependencies
vi.mock('@/services/socket', () => ({
  signalingService: {
    connect: vi.fn().mockResolvedValue(undefined),
    onConnectError: vi.fn(),
    joinRoom: vi.fn().mockResolvedValue({}),
    leaveRoom: vi.fn(),
    onPeerJoined: vi.fn(),
    onPeerLeft: vi.fn(),
    onAuthVerified: vi.fn((cb) => cb({ staticId: '100 001', myDeviceId: 'dev-1' })),
    disconnect: vi.fn(),
    offAuthVerified: vi.fn(),
    roomId: '100000'
  }
}));

vi.mock('@/services/settingsManager', () => ({
  settingsManager: {
    applyCurrentTheme: vi.fn()
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

// A dummy component to act as our TransferView for testing <keep-alive> unmount prevention
// Actually, it's better to import the real TransferView so we can prove it's protected
import TransferView from '../views/TransferView.vue';

const DummyOtherView = { template: '<div>Other View</div>' };

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: TransferView, meta: { layout: 'MainLayout' } },
    { path: '/other', component: DummyOtherView, meta: { layout: 'MainLayout' } }
  ]
});

describe('App.vue - Routing KeepAlive Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[TDD] should not trigger TransferView unmount (leaveRoom) when navigating to another route', async () => {
    // 1. 先推进路由器，然后挂载主应用
    router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          MainLayout: { template: '<div><slot></slot></div>' },
          AuthGuardModal: true,
          ConnectionPanel: true,
          UploadZone: true,
          TransferList: true,
          TransferCard: true
        }
      }
    });

    await flushPromises();

    // 确认我们起手的确调用了初始化相关指令，即 TransferView 正常上屏了
    expect(signalingService.onAuthVerified).toHaveBeenCalled();
    expect(signalingService.connect).toHaveBeenCalled();

    // 2. 模拟切走路由，比如用户切去了 Settings 界面
    await router.push('/other');
    await flushPromises();

    // 3. 断言核心逻辑：因为有 <keep-alive>，TransferView 不能被 unmount
    // 所以 leaveRoom 和 webrtc.close (在业务代码里体现为 signalingService.leaveRoom) 绝不应当被叫起
    expect(signalingService.leaveRoom).not.toHaveBeenCalled();

    // 此时如果我们真要硬销毁整个 App.vue (关闭窗口)，它才会被迫级联触发毁除
    wrapper.unmount();
    expect(signalingService.leaveRoom).toHaveBeenCalled();
  });
});
