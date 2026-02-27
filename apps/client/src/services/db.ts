import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type TransferType = 'send' | 'receive';
export type TransferStatus = 'success' | 'failed' | 'cancelled';

export interface TransferRecord {
  id: string; // UUID
  filename: string;
  size: number;
  type: TransferType;
  status: TransferStatus;
  peerName: string;
  timestamp: number;
}

export interface P2PTransferDB extends DBSchema {
  history: {
    key: string;
    value: TransferRecord;
    indexes: {
      'by-timestamp': number;
      'by-type': string;
      'by-status': string;
    };
  };
}

const DB_NAME = 'p2p-transfer-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<P2PTransferDB>> | null = null;

export const getDB = (): Promise<IDBPDatabase<P2PTransferDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<P2PTransferDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-type', 'type');
          store.createIndex('by-status', 'status');
        }
      },
    });
  }
  return dbPromise;
};

export const historyService = {
  /**
   * 添加一条传输历史记录
   */
  async addRecord(record: TransferRecord): Promise<string> {
    const db = await getDB();
    return db.add('history', record);
  },

  /**
   * 更新传输历史记录 (例如从 success 更新为 failed)
   */
  async updateRecord(record: TransferRecord): Promise<string> {
    const db = await getDB();
    return db.put('history', record); // put 可以用于更新
  },

  /**
   * 获取所有历史记录，按时间倒序排列
   */
  async getAllRecords(): Promise<TransferRecord[]> {
    const db = await getDB();
    // 使用游标可以实现倒序，但如果不考虑超大数据量，也可以直接 getAll 然后 sort
    const records = await db.getAllFromIndex('history', 'by-timestamp');
    return records.sort((a, b) => b.timestamp - a.timestamp); // 倒序
  },

  /**
   * 清除所有记录
   */
  async clearAll(): Promise<void> {
    const db = await getDB();
    await db.clear('history');
  }
};
