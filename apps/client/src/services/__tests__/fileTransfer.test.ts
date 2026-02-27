import { describe, it, expect, vi, beforeEach } from 'vitest';
import { __BaseEngine, TransferEngine, FileReceiverEngine } from '../fileTransfer';
import { historyService } from '../db';

vi.mock('../db', () => ({
  historyService: {
    addRecord: vi.fn().mockResolvedValue('mock-id'),
  }
}));

describe('__BaseEngine', () => {
  it('formats speed correctly from bytes per second', () => {
    // 为了测试 protected 方法，我们创建一个暴露出该方法的测试用例继承类
    class TestEngine extends __BaseEngine {
      public testFormatSpeed(bytesPerSec: number) {
        return this.formatSpeed(bytesPerSec);
      }
    }

    const engine = new TestEngine('test-id');

    expect(engine.testFormatSpeed(0)).toBe('0 B/s');
    expect(engine.testFormatSpeed(1024)).toBe('1 KB/s');
    expect(engine.testFormatSpeed(1024 * 1024 * 2.5)).toBe('2.5 MB/s');
    expect(engine.testFormatSpeed(1024 * 1024 * 1024 * 1.2)).toBe('1.2 GB/s');

    // RED 断言：故意多写一个断言，期待它失败以践行 TDD 中的第一步（或因为现有逻辑缺少某些特定处理导致失败）
    // 假定我们需要它在传入负数时返回 "0 B/s"
    expect(engine.testFormatSpeed(-100)).toBe('0 B/s');
  });

  it('formats remaining time correctly', () => {
    class TestEngine extends __BaseEngine {
      public testFormatTime(seconds: number) {
        return this.formatTime(seconds);
      }
    }

    const engine = new TestEngine('test-id');

    expect(engine.testFormatTime(45)).toBe('剩余 45 秒');
    expect(engine.testFormatTime(60)).toBe('剩余 1 分 0 秒');
    expect(engine.testFormatTime(125)).toBe('剩余 2 分 5 秒');

    // RED 断言：期待它支持传入负数或者过大的格式化 (现存逻辑对小时无支持)
    expect(engine.testFormatTime(3665)).toBe('剩余 1 小时 1 分 5 秒');
  });
});

describe('History persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save to history on send failure/cancel', () => {
    const file = new File(['test content data'], 'test.txt', { type: 'text/plain' });
    const engine = new TransferEngine(file, 'transfer-1', { peerName: 'Bob-iOS' });

    // Simulate manual configuration and cancel trigger
    engine.cancel();

    expect(historyService.addRecord).toHaveBeenCalledWith(expect.objectContaining({
      id: 'transfer-1',
      filename: 'test.txt',
      type: 'send',
      status: 'failed',
      peerName: 'Bob-iOS',
      size: 17 // byte length of 'test content data'
    }));
  });

  it('should save to history on receive failure/cancel', () => {
    const engine = new FileReceiverEngine('receive-1', 'video.mp4', 1024, { peerName: 'Alice-Mac' });

    engine.cancel();

    expect(historyService.addRecord).toHaveBeenCalledWith(expect.objectContaining({
      id: 'receive-1',
      filename: 'video.mp4',
      size: 1024,
      type: 'receive',
      status: 'failed',
      peerName: 'Alice-Mac'
    }));
  });
});
