/**
 * AuthGuardModal 鉴权弹窗单元测试
 *
 * 对应测试计划：G-01 ~ G-05
 * -----------------------------------------------
 * G-01  isVisible=true 时弹窗应渲染，遮挡内容        ✅
 * G-02  错误令牌提交后，应显示红色错误信息            ✅
 * G-03  正确令牌（通过 connect）后，应 emit success   ✅
 * G-04  在输入框按 Enter，等效于点击提交按钮          ✅
 * G-05  眼睛图标点击可切换密码明文/密文               ✅
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AuthGuardModal from '../AuthGuardModal.vue';
import { settingsManager } from '@/services/settingsManager';
import { signalingService } from '@/services/socket';

// ── Mock 依赖 ──────────────────────────────────────────────────────────────

vi.mock('@/services/settingsManager', () => ({
  settingsManager: {
    getAccessToken: vi.fn(() => ''),
    updateSettings: vi.fn(),
  },
}));

vi.mock('@/services/socket', () => ({
  signalingService: {
    connect: vi.fn(),
  },
}));

// ── 测试套件 ──────────────────────────────────────────────────────────────

describe('AuthGuardModal 鉴权弹窗', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // G-01：isVisible=true 时弹窗应完整渲染
  // --------------------------------------------------------------------------
  it('[G-01] isVisible=true 时应渲染弹窗并显示"私有化通行证"标题', () => {
    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: true },
    });

    expect(wrapper.text()).toContain('私有化通行证');
    // 弹窗容器应可见
    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('[G-01] isVisible=false 时不应渲染任何弹窗内容', () => {
    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: false },
    });

    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('私有化通行证');
  });

  // --------------------------------------------------------------------------
  // G-02：错误令牌提交应显示红色错误信息，且不 emit success
  // --------------------------------------------------------------------------
  it('[G-02] 输入错误令牌提交后，应展示错误信息，不 emit success', async () => {
    const errorMsg = '握手失败，口令错误或服务器无响应。';
    vi.mocked(signalingService.connect).mockRejectedValue(new Error(errorMsg));

    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: true },
    });

    // 输入令牌内容
    await wrapper.find('input').setValue('wrong-token');
    // 点击提交按钮
    await wrapper.find('button[class*="bg-gradient"]').trigger('click');
    await flushPromises();

    // 错误信息可见
    expect(wrapper.text()).toContain(errorMsg);
    // 未触发 success 事件
    expect(wrapper.emitted('success')).toBeFalsy();
  });

  // --------------------------------------------------------------------------
  // G-03：正确令牌提交后，应保存设置并 emit success
  // --------------------------------------------------------------------------
  it('[G-03] 正确令牌提交后应保存 Token 并 emit success 事件', async () => {
    vi.mocked(signalingService.connect).mockResolvedValue(undefined);

    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: true },
    });

    await wrapper.find('input').setValue('p2p-send-2026');
    await wrapper.find('button[class*="bg-gradient"]').trigger('click');
    await flushPromises();

    // 应调用 updateSettings 保存令牌
    expect(settingsManager.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ globalAccessToken: 'p2p-send-2026' })
    );
    // 应触发 connect 连接服务器
    expect(signalingService.connect).toHaveBeenCalled();
    // 应 emit success
    expect(wrapper.emitted('success')).toBeTruthy();
    expect(wrapper.emitted('success')).toHaveLength(1);
  });

  // --------------------------------------------------------------------------
  // G-04：在输入框按 Enter 键，等效于点击提交按钮
  // --------------------------------------------------------------------------
  it('[G-04] 在输入框按 Enter 键应触发提交逻辑', async () => {
    vi.mocked(signalingService.connect).mockResolvedValue(undefined);

    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: true },
    });

    await wrapper.find('input').setValue('p2p-send-2026');
    // 触发 keyup.enter 事件
    await wrapper.find('input').trigger('keyup.enter');
    await flushPromises();

    // connect 被调用，说明提交逻辑触发了
    expect(signalingService.connect).toHaveBeenCalled();
    expect(wrapper.emitted('success')).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // G-05：点击眼睛图标可切换 input 类型（password ↔ text）
  // --------------------------------------------------------------------------
  it('[G-05] 点击眼睛图标应切换输入框在密码模式与明文模式之间', async () => {
    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: true },
    });

    const input = wrapper.find('input');
    // 初始应为 password 模式
    expect(input.attributes('type')).toBe('password');

    // 点击眼睛按钮（第二个 button）
    const toggleBtn = wrapper.findAll('button')[0]!;
    await toggleBtn.trigger('click');

    // 切换为明文
    expect(input.attributes('type')).toBe('text');

    // 再次点击，切回密码
    await toggleBtn.trigger('click');
    expect(input.attributes('type')).toBe('password');
  });

  // --------------------------------------------------------------------------
  // 边界：令牌为空时，提交按钮应被禁用（不触发 connect）
  // --------------------------------------------------------------------------
  it('[G-02 边界] 令牌输入为空时，提交逻辑不应执行', async () => {
    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: true },
    });

    // 不填写任何内容，直接点击按钮
    await wrapper.find('button[class*="bg-gradient"]').trigger('click');
    await flushPromises();

    expect(signalingService.connect).not.toHaveBeenCalled();
    expect(wrapper.emitted('success')).toBeFalsy();
  });

  // --------------------------------------------------------------------------
  // 弹窗显示时，应自动从 settingsManager 填充已缓存的 Token
  // --------------------------------------------------------------------------
  it('[G-03 前置] 弹窗出现时应自动读取并填充上次保存的 Token', async () => {
    vi.mocked(settingsManager.getAccessToken).mockReturnValue('cached-token-123');

    const wrapper = mount(AuthGuardModal, {
      props: { isVisible: false },
    });

    // 弹窗从隐藏变为显示
    await wrapper.setProps({ isVisible: true });

    const input = wrapper.find('input');
    expect((input.element as HTMLInputElement).value).toBe('cached-token-123');
  });
});
