import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { historyService, getDB, type TransferRecord } from '../db';

describe('History DB Service', () => {
  beforeEach(async () => {
    // 每次测试前清空数据库，确保测试独立性
    await historyService.clearAll();
  });

  it('should initialize the database and store correctly', async () => {
    const db = await getDB();
    expect(db.name).toBe('p2p-transfer-db');
    expect(db.objectStoreNames.contains('history')).toBe(true);
  });

  it('should add a new record to the history store', async () => {
    const record: TransferRecord = {
      id: 'mock-uuid-1',
      filename: 'test.pdf',
      size: 1024,
      type: 'send',
      status: 'success',
      peerName: 'Device A',
      timestamp: Date.now()
    };

    await historyService.addRecord(record);
    const records = await historyService.getAllRecords();

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(record);
  });

  it('should get all records sorted by timestamp descending', async () => {
    const record1: TransferRecord = {
      id: 'mock-uuid-older',
      filename: 'old.txt',
      size: 100,
      type: 'receive',
      status: 'success',
      peerName: 'Device B',
      timestamp: 1000 // Older
    };

    const record2: TransferRecord = {
      id: 'mock-uuid-newer',
      filename: 'new.mp4',
      size: 200,
      type: 'send',
      status: 'failed',
      peerName: 'Device C',
      timestamp: 2000 // Newer
    };

    await historyService.addRecord(record1);
    await historyService.addRecord(record2);

    const records = await historyService.getAllRecords();

    expect(records).toHaveLength(2);
    // 应该按照倒序排列，newer 先出
    expect(records[0]!.id).toBe('mock-uuid-newer');
    expect(records[1]!.id).toBe('mock-uuid-older');
  });

  it('should update an existing record status', async () => {
    const record: TransferRecord = {
      id: 'mock-uuid-update',
      filename: 'update.png',
      size: 50,
      type: 'send',
      status: 'success',
      peerName: 'Device D',
      timestamp: Date.now()
    };

    await historyService.addRecord(record);

    // 改变状态并更新
    record.status = 'failed';
    await historyService.updateRecord(record);

    const records = await historyService.getAllRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.status).toBe('failed');
  });
});
