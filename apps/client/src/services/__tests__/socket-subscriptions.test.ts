import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signalingService } from '../socket';
import { SocketEvent } from '@repo/shared';

describe('SignalingService - Subscription Handlers', () => {
  beforeEach(() => {
    // 每次开始前都将 socket 重置干净
    signalingService.disconnect();
  });

  it('[TDD] should retain event listeners even if registered before connect()', async () => {
    // Arrange: 用户操作（此时内部 socket 未实例化，应被推入待办或提前实例化）
    const callback = vi.fn();
    signalingService.onAuthVerified(callback);

    // Act: 发起真实连接建立 socket
    // (这里不再真实联网，只是用一个 Mock socket 替代它被实例出来的动作)
    signalingService.socket = {
      on: vi.fn(),
      off: vi.fn()
    } as any;

    // 我们要求在实际连接成功、或者在重新绑定时，能够把之前的事件补绑上去
    // 为了简单化我们直接假设如果此时在 socket 上 emit 该事件，回调应该被叫起
    // 因为这里测试的是注册机制，我们主动去调用那个原本以为会被抛弃的 bind（需要在单例内部实现）

    // 如果没有好的待办挂载点，我们只要断言此方法不能因为 socket 是 null 就默默吞噬
    // 最有效做法：改造 service，使其支持懒加载或提早暴露 EventEmitter
    // 这里我们先执行重新 bind 的逻辑如果 service 支持的话
    if (typeof (signalingService as any)._applyQueuedListeners === 'function') {
      (signalingService as any)._applyQueuedListeners();
    }

    // 我们手工向内部暴露的 Mock 发出指令，看外部是否接到了
    const mockSocket = signalingService.socket as any;
    expect(mockSocket.on).toHaveBeenCalledWith(SocketEvent.AUTH_VERIFIED, callback);
  });
});
