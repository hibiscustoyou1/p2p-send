import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, shallowMount, flushPromises } from '@vue/test-utils';
import { defineComponent, ref, nextTick, KeepAlive } from 'vue';
import DevicesView from '../DevicesView.vue';
import { deviceManager } from '@/services/deviceManager';
import { signalingService } from '@/services/socket';
import { useRouter } from 'vue-router';

// --- Mock Vue Router ---
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}));

// --- Mock Socket ---
vi.mock('@/services/socket', () => ({
  signalingService: {
    connect: vi.fn().mockResolvedValue(undefined),
    clearListeners: vi.fn(),
    checkDeviceOnlineStatus: vi.fn(),
    onDeviceStatusChanged: vi.fn(),
  }
}));

// --- Mock Device Manager ---
vi.mock('@/services/deviceManager', () => ({
  deviceManager: {
    getAllDevices: vi.fn(),
    updateDeviceAlias: vi.fn(),
    removeDevice: vi.fn(),
  }
}));

// ===================================================================
// 测试辅助工具：创建带 keep-alive 容器的包装组件
// 这是测试 onActivated/onDeactivated 钩子的正确方式
// ===================================================================
function createKeepAliveWrapper() {
  const isVisible = ref(true);

  const Wrapper = defineComponent({
    components: { DevicesView },
    setup() {
      return { isVisible };
    },
    template: `
      <KeepAlive>
        <DevicesView v-if="isVisible" />
      </KeepAlive>
    `,
  });

  return { Wrapper, isVisible };
}

describe('DevicesView Component', () => {
  const mockRouterPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockRouterPush });

    // 预设默认的模拟数据
    vi.mocked(deviceManager.getAllDevices).mockReturnValue([
      { id: 'dev-1', originalName: 'Device 1', deviceType: 'unknown', addedAt: 1000, lastSeen: 1000 },
      { id: 'dev-2', originalName: 'Device 2', alias: 'My Phone', deviceType: 'mobile', addedAt: 2000, lastSeen: 2000 },
    ]);
  });

  describe('挂载与设备探测逻辑', () => {
    it('正常挂载时应加载本地受信任设备，并向服务器发起在线状态问询', async () => {
      const { Wrapper } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: {
          stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true }
        }
      });
      await flushPromises();

      // 断言调用了获取本地记录
      expect(deviceManager.getAllDevices).toHaveBeenCalled();
      // 断言调用了在线探活，附带从列表里抽出的设备 ID
      expect(signalingService.checkDeviceOnlineStatus).toHaveBeenCalledWith(['dev-1', 'dev-2']);
      expect(signalingService.connect).toHaveBeenCalled();
    });

    it('无本地设备时显示缺省兜底槽位，并不会发起后端在线探活', async () => {
      vi.mocked(deviceManager.getAllDevices).mockReturnValue([]);

      const { Wrapper } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      expect(wrapper.html()).toContain('暂无信任连接');
      expect(signalingService.checkDeviceOnlineStatus).not.toHaveBeenCalled();
    });
  });

  describe('在线状态实时点亮机制', () => {
    it('收到服务器推送特定设备上线或下线时，能正确映射到响应式缓存 Set 中', async () => {
      // 获取绑定的回调函数句柄
      let statusCallback: (payload: any) => void = () => { };
      vi.mocked(signalingService.onDeviceStatusChanged).mockImplementation((cb) => {
        statusCallback = cb;
      });

      const { Wrapper } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      // 通过 DevicesView 子组件来查询内部 DeviceCard
      const devicesView = wrapper.findComponent(DevicesView);
      const cardsBefore = devicesView.findAllComponents({ name: 'DeviceCard' });
      expect(cardsBefore[0]!.props('status')).toBe('offline');

      // 模拟服务器推送 dev-1 上线
      statusCallback({ deviceId: 'dev-1', status: 'online' });
      await nextTick();

      const cardsAfterOn = devicesView.findAllComponents({ name: 'DeviceCard' });
      expect(cardsAfterOn[0]!.props('status')).toBe('online');
      expect(cardsAfterOn[1]!.props('status')).toBe('offline');

      // 模拟服务器推送 dev-1 下线
      statusCallback({ deviceId: 'dev-1', status: 'offline' });
      await nextTick();
      const cardsAfterOff = devicesView.findAllComponents({ name: 'DeviceCard' });
      expect(cardsAfterOff[0]!.props('status')).toBe('offline');
    });
  });

  // ===================================================================
  // 【核心回归测试】keep-alive 激活场景 - 专门覆盖本次 Bug 的复现路径
  // Bug 复现：P2P 连接成功后切至设备列表，设备显示离线
  // 根因：onMounted 在 keep-alive 中只执行一次，切回时不重新查询
  // ===================================================================
  describe('keep-alive 缓存激活场景（核心回归）', () => {
    it('组件从 keep-alive 缓存再次激活时，应清空旧状态并重新发起在线查询', async () => {
      const { Wrapper, isVisible } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      // 验证首次挂载（onActivated 首次触发）已执行查询
      expect(signalingService.checkDeviceOnlineStatus).toHaveBeenCalledTimes(1);
      expect(signalingService.onDeviceStatusChanged).toHaveBeenCalledTimes(1);

      // 模拟 keep-alive 失活：将 v-if 置为 false 切换到其他页面
      isVisible.value = false;
      await flushPromises();

      // 验证 deactivated 时清除了监听器
      expect(signalingService.clearListeners).toHaveBeenCalledTimes(1);

      // 重置调用计数以便精确计量第二次激活
      vi.clearAllMocks();
      vi.mocked(deviceManager.getAllDevices).mockReturnValue([
        { id: 'dev-1', originalName: 'Device 1', deviceType: 'unknown', addedAt: 1000, lastSeen: 1000 },
        { id: 'dev-2', originalName: 'Device 2', alias: 'My Phone', deviceType: 'mobile', addedAt: 2000, lastSeen: 2000 },
      ]);
      vi.mocked(signalingService.connect).mockResolvedValue(undefined);

      // 模拟 keep-alive 从缓存中重新激活（用户切回设备列表页）
      isVisible.value = true;
      await flushPromises();

      // 【关键断言】第二次激活必须重新发起查询（这正是 Bug 的修复点）
      expect(signalingService.checkDeviceOnlineStatus).toHaveBeenCalledTimes(1);
      // 必须重新注册状态监听器（因为 deactivated 时已清除）
      expect(signalingService.onDeviceStatusChanged).toHaveBeenCalledTimes(1);
    });

    it('组件重新激活后，旧的在线状态 Set 应被清空，不再残留上次的脏数据', async () => {
      let statusCallback: (payload: any) => void = () => { };
      vi.mocked(signalingService.onDeviceStatusChanged).mockImplementation((cb) => {
        statusCallback = cb;
      });

      const { Wrapper, isVisible } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      const devicesView = wrapper.findComponent(DevicesView);

      // 第一次激活时标记 dev-1 为在线
      statusCallback({ deviceId: 'dev-1', status: 'online' });
      await nextTick();

      // 验证此时 dev-1 确实显示在线
      expect(devicesView.findAllComponents({ name: 'DeviceCard' })[0]!.props('status')).toBe('online');

      // 模拟切换页面（失活）再切回（重新激活）
      isVisible.value = false;
      await flushPromises();
      isVisible.value = true;
      await flushPromises();

      // 【关键断言】重新激活后在线状态应被清空，dev-1 回到离线（等待服务器重新推送）
      const cards = devicesView.findAllComponents({ name: 'DeviceCard' });
      expect(cards[0]!.props('status')).toBe('offline');
    });

    it('组件切离时（onDeactivated）必须清除监听器', async () => {
      const { Wrapper, isVisible } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      // 模拟切走页面触发 deactivated
      isVisible.value = false;
      await flushPromises();

      expect(signalingService.clearListeners).toHaveBeenCalled();
    });
  });

  describe('用户交互与组件事件', () => {
    it('接收子组件抛出的 @edit 时应当显示编辑 Modal 并能通过 Modal 确认更新 Alias', async () => {
      const { Wrapper } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      const devicesView = wrapper.findComponent(DevicesView);
      const editModal = devicesView.findComponent({ name: 'DeviceEditModal' });

      // 1. 触发编辑
      (devicesView.vm as any).handleEdit('dev-1');
      await nextTick();

      // 断言 Modal 显示
      expect(editModal.props('isVisible')).toBe(true);
      expect(editModal.props('deviceName')).toBe('Device 1');

      // 2. 模拟 Modal 确认
      editModal.vm.$emit('confirm', 'My New PC');
      await nextTick();

      expect(deviceManager.updateDeviceAlias).toHaveBeenCalledWith('dev-1', 'My New PC');
      // 初始化1次（onActivated）+ 重读1次（onEditConfirm 后）
      expect(deviceManager.getAllDevices).toHaveBeenCalledTimes(2);
    });

    it('接收子组件抛出的 @remove 时应当显示确认 Modal 并能通过 Modal 确认删除', async () => {
      const { Wrapper } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      const devicesView = wrapper.findComponent(DevicesView);
      const confirmModal = devicesView.findComponent({ name: 'DeviceConfirmModal' });

      // 1. 触发移除
      (devicesView.vm as any).handleRemove('dev-2');
      await nextTick();

      // 断言 Modal 显示
      expect(confirmModal.props('isVisible')).toBe(true);

      // 2. 模拟 Modal 确认
      confirmModal.vm.$emit('confirm');
      await nextTick();

      expect(deviceManager.removeDevice).toHaveBeenCalledWith('dev-2');
      expect(deviceManager.getAllDevices).toHaveBeenCalledTimes(2);
    });

    it('接收子组件抛出的 @send 时应当调用 router push 跳转传入 query 参数', async () => {
      const { Wrapper } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      const devicesView = wrapper.findComponent(DevicesView);
      (devicesView.vm as any).handleSend('dev-1');

      expect(mockRouterPush).toHaveBeenCalledWith({ path: '/transfer', query: { connectTo: 'dev-1' } });
    });
  });

  describe('生命周期管理', () => {
    it('keep-alive 容器整体卸载时，必须触发 deactivated 清除监听器防止泄漏', async () => {
      const { Wrapper } = createKeepAliveWrapper();
      const wrapper = mount(Wrapper, {
        global: { stubs: { SvgIcon: true, DeviceCard: true, DeviceEditModal: true, DeviceConfirmModal: true } }
      });
      await flushPromises();

      // 整体卸载 keep-alive 容器（模拟用户关闭页面/组件被销毁）
      // keep-alive 组件被销毁时，内部缓存的组件会先触发 deactivated，再触发 unmounted
      wrapper.unmount();
      await flushPromises();

      expect(signalingService.clearListeners).toHaveBeenCalled();
    });
  });
});
