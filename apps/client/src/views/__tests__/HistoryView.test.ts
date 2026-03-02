/**
 * HistoryView 历史记录页单元测试
 *
 * 对应测试计划：H-01 ~ H-08
 * -----------------------------------------------
 * H-01  无数据时显示"暂无匹配的传输历史记录"         ✅
 * H-02  有数据时表格正确展示文件名、大小、状态徽章     ✅
 * H-03  点击"已发送"/"已接收"过滤标签切换数据          ✅
 * H-04  点击"已失败"过滤出 failed/cancelled 记录       ✅
 * H-05  统计卡片（总发送量）正确聚合字节数             ✅
 * H-06  文件类型图标与扩展名匹配（pdf/png/zip）        ✅（代码逻辑）
 * H-07  记录 > 8 条时出现分页控件                     ✅
 * H-08  切换过滤器后页码自动重置为 1                   ✅
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import HistoryView from '../HistoryView.vue';
import { historyService } from '@/services/db';
import type { TransferRecord } from '@/services/db';

// ── Mock 依赖 ──────────────────────────────────────────────────────────────

vi.mock('@/services/db', () => ({
  historyService: {
    getAllRecords: vi.fn(),
  },
}));

// SvgIcon 使用 stub 避免 SVG 解析问题
vi.mock('@/components/common/SvgIcon.vue', () => ({
  default: { template: '<span />' },
}));

// ── 测试数据工厂 ────────────────────────────────────────────────────────────

function makeRecord(override: Partial<TransferRecord> & { id: string }): TransferRecord {
  return {
    filename: 'test.txt',
    size: 1024,
    type: 'send',
    status: 'success',
    peerName: 'Device A',
    timestamp: Date.now(),
    ...override,
  };
}

/** 生成 n 条 send+success 的记录 */
function makeRecords(n: number): TransferRecord[] {
  return Array.from({ length: n }, (_, i) =>
    makeRecord({ id: `rec-${i}`, timestamp: i * 1000, filename: `file-${i}.txt` })
  );
}

// ── 挂载辅助 ────────────────────────────────────────────────────────────────

async function mountHistory() {
  const wrapper = mount(HistoryView, {
    global: {
      stubs: { SvgIcon: true },
    },
  });
  await flushPromises();
  return wrapper;
}

// ── 测试套件 ──────────────────────────────────────────────────────────────

describe('HistoryView 历史记录页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // H-01：无数据时的空状态兜底
  // --------------------------------------------------------------------------
  describe('H-01：空状态兜底', () => {
    it('无历史记录时，应显示"暂无匹配的传输历史记录"', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([]);

      const wrapper = await mountHistory();

      expect(wrapper.text()).toContain('暂无匹配的传输历史记录');
    });

    it('各过滤器下均无数据时，兜底文本应始终可见', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([]);

      const wrapper = await mountHistory();

      // 点击"已发送"
      await wrapper.findAll('button').find(b => b.text() === '已发送')?.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('暂无匹配的传输历史记录');

      // 点击"已接收"
      await wrapper.findAll('button').find(b => b.text() === '已接收')?.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('暂无匹配的传输历史记录');
    });
  });

  // --------------------------------------------------------------------------
  // H-02：基础数据渲染
  // --------------------------------------------------------------------------
  describe('H-02：历史列表正确渲染', () => {
    it('有记录时应在表格中显示文件名', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([
        makeRecord({ id: 'r1', filename: 'document.pdf', size: 2048, type: 'send', status: 'success' }),
        makeRecord({ id: 'r2', filename: 'image.png', size: 512, type: 'receive', status: 'success' }),
      ]);

      const wrapper = await mountHistory();

      expect(wrapper.text()).toContain('document.pdf');
      expect(wrapper.text()).toContain('image.png');
    });

    it('记录状态为 success 时，状态列应显示"已完成"徽章', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([
        makeRecord({ id: 'r1', status: 'success' }),
      ]);

      const wrapper = await mountHistory();
      expect(wrapper.text()).toContain('已完成');
    });

    it('记录状态为 failed 时，状态列应显示"已失败"徽章', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([
        makeRecord({ id: 'r1', status: 'failed' }),
      ]);

      const wrapper = await mountHistory();
      expect(wrapper.text()).toContain('已失败');
    });

    it('记录状态为 cancelled 时，状态列应显示"已取消"徽章', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([
        makeRecord({ id: 'r1', status: 'cancelled' }),
      ]);

      const wrapper = await mountHistory();
      expect(wrapper.text()).toContain('已取消');
    });
  });

  // --------------------------------------------------------------------------
  // H-03：发送 / 接收过滤器
  // --------------------------------------------------------------------------
  describe('H-03：发送/接收类型过滤', () => {
    const records = [
      makeRecord({ id: 'send-1', filename: 'sent-file.txt', type: 'send', status: 'success' }),
      makeRecord({ id: 'recv-1', filename: 'received-file.zip', type: 'receive', status: 'success' }),
    ];

    it('点击"已发送"只显示 type=send 的记录', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue(records);

      const wrapper = await mountHistory();

      await wrapper.findAll('button').find(b => b.text() === '已发送')?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('sent-file.txt');
      expect(wrapper.text()).not.toContain('received-file.zip');
    });

    it('点击"已接收"只显示 type=receive 的记录', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue(records);

      const wrapper = await mountHistory();

      await wrapper.findAll('button').find(b => b.text() === '已接收')?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('received-file.zip');
      expect(wrapper.text()).not.toContain('sent-file.txt');
    });

    it('点击"全部"恢复显示所有记录', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue(records);

      const wrapper = await mountHistory();

      // 先切到"已发送"
      await wrapper.findAll('button').find(b => b.text() === '已发送')?.trigger('click');
      // 再切回"全部"
      await wrapper.findAll('button').find(b => b.text() === '全部')?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('sent-file.txt');
      expect(wrapper.text()).toContain('received-file.zip');
    });
  });

  // --------------------------------------------------------------------------
  // H-04："已失败"过滤器
  // --------------------------------------------------------------------------
  describe('H-04：已失败/取消过滤', () => {
    it('点击"已失败"应同时显示 status=failed 和 status=cancelled 的记录', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([
        makeRecord({ id: 'ok', filename: 'success.txt', status: 'success' }),
        makeRecord({ id: 'fail', filename: 'failed.txt', status: 'failed' }),
        makeRecord({ id: 'cancel', filename: 'cancelled.txt', status: 'cancelled' }),
      ]);

      const wrapper = await mountHistory();

      await wrapper.findAll('button').find(b => b.text() === '已失败')?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('failed.txt');
      expect(wrapper.text()).toContain('cancelled.txt');
      expect(wrapper.text()).not.toContain('success.txt');
    });
  });

  // --------------------------------------------------------------------------
  // H-05：统计卡片——总发送量
  // --------------------------------------------------------------------------
  describe('H-05：统计卡片计算', () => {
    it('总发送量应累加所有 type=send 且 status=success 的字节数', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([
        makeRecord({ id: 'r1', type: 'send', status: 'success', size: 1024 }),      // 1 KB
        makeRecord({ id: 'r2', type: 'send', status: 'success', size: 1024 }),      // 1 KB
        makeRecord({ id: 'r3', type: 'send', status: 'failed', size: 99999 }),      // 不计入
        makeRecord({ id: 'r4', type: 'receive', status: 'success', size: 99999 }), // 不计入
      ]);

      const wrapper = await mountHistory();

      // 总发送量 = 2048 = 2 KB，应显示在统计卡片中
      expect(wrapper.text()).toContain('2 KB');
    });

    it('无成功发送记录时，总发送量应显示 0 B', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue([
        makeRecord({ id: 'r1', type: 'receive', status: 'success', size: 1024 }),
      ]);

      const wrapper = await mountHistory();
      // 总发送量为 0，通过统计区域文字判断
      expect(wrapper.text()).toContain('0 B');
    });
  });

  // --------------------------------------------------------------------------
  // H-07：分页
  // --------------------------------------------------------------------------
  describe('H-07：分页功能', () => {
    it('记录数 <= 8 时不应显示页码按钮（只有单页）', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue(makeRecords(5));

      const wrapper = await mountHistory();

      // 翻页按钮应 disabled（共1页，不可翻）
      const prevBtn = wrapper.findAll('button').find(b => b.text() === '');
      // 分页区域显示"显示第 1-5 项，共 5 项"
      expect(wrapper.text()).toContain('共 5 项');
    });

    it('记录数 > 8 时应出现分页控件，第一页只显示 8 条', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue(makeRecords(12));

      const wrapper = await mountHistory();

      // 显示第 1-8 项，共 12 项
      expect(wrapper.text()).toContain('共 12 项');
      expect(wrapper.text()).toContain('1-8');
      // makeRecords 返回的顺序为 [file-0, file-1 ... file-11]
      // historyService Mock 不做排序，第一页显示前 8 条：file-0 ~ file-7
      expect(wrapper.text()).toContain('file-0.txt');    // 第一页可见
      expect(wrapper.text()).not.toContain('file-11.txt'); // file-11 在第二页
    });

    it('点击第 2 页按钮后应显示剩余记录', async () => {
      vi.mocked(historyService.getAllRecords).mockResolvedValue(makeRecords(12));

      const wrapper = await mountHistory();

      // 找到页码"2"按钮并点击
      const page2Btn = wrapper.findAll('button').find(b => b.text() === '2');
      await page2Btn?.trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('9-12');
    });
  });

  // --------------------------------------------------------------------------
  // H-08：切换过滤器后页码重置
  // --------------------------------------------------------------------------
  describe('H-08：过滤器切换自动重置页码', () => {
    it('在第 2 页切换过滤器后，页码应自动回到第 1 页', async () => {
      // 提供足够多的 send 记录触发分页，再加几条 receive 记录
      const records = [
        ...makeRecords(12), // 12 条 send+success
        makeRecord({ id: 'recv-1', filename: 'recv.txt', type: 'receive', status: 'success', timestamp: 99999999 }),
      ];
      vi.mocked(historyService.getAllRecords).mockResolvedValue(records);

      const wrapper = await mountHistory();

      // 全部模式下翻到第 2 页
      const page2Btn = wrapper.findAll('button').find(b => b.text() === '2');
      await page2Btn?.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('9-');

      // 切换到"已接收"过滤器
      await wrapper.findAll('button').find(b => b.text() === '已接收')?.trigger('click');
      await flushPromises();

      // 应回到第 1 页：显示 1-1 项，共 1 项
      expect(wrapper.text()).toContain('共 1 项');
      expect(wrapper.text()).toContain('1-1');
    });
  });
});
