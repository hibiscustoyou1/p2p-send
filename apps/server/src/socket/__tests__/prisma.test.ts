import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupSocket } from '../index';
import { Server as HttpServer } from 'http';
import { io as Client } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';

vi.mock('@prisma/client', () => {
  const mPrisma = {
    deviceRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn()
    }
  };
  return {
    PrismaClient: class {
      deviceRecord = mPrisma.deviceRecord;
    }
  };
});

describe('Static ID Allocation (Prisma logic)', () => {
  let ioServer: any;
  let httpServer: any;
  let port: number;
  let originalToken: string | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    originalToken = process.env.GLOBAL_ACCESS_TOKEN;
    process.env.GLOBAL_ACCESS_TOKEN = 'mock';

    httpServer = new HttpServer();
    ioServer = setupSocket(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  afterEach(() => {
    process.env.GLOBAL_ACCESS_TOKEN = originalToken;
    ioServer.close();
    httpServer.close();
  });

  it('[TDD] should create new staticId starting from 000000 if user does not exist', () => {
    return new Promise<void>((resolve) => {
      const prisma = new PrismaClient();
      (prisma.deviceRecord.findUnique as any).mockResolvedValue(null);
      (prisma.deviceRecord.aggregate as any).mockResolvedValue({ _max: { staticId: null } });
      (prisma.deviceRecord.create as any).mockImplementation((args: any) => Promise.resolve({ ...args.data }));

      const client = Client(`http://localhost:${port}`, {
        auth: { token: 'mock' },
        query: { deviceId: 'new-uuid-1' }
      });

      client.on('AUTH_VERIFIED', (res) => {
        expect(res.staticId).toBe('000000');
        expect(res.myDeviceId).toBe('new-uuid-1');

        expect(prisma.deviceRecord.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { uuid: 'new-uuid-1', staticId: 0 }
          })
        );
        client.close();
        resolve();
      });
    });
  });

  it('[TDD] should increment max staticId for new users if table is not empty', () => {
    return new Promise<void>((resolve) => {
      const prisma = new PrismaClient();
      (prisma.deviceRecord.findUnique as any).mockResolvedValue(null);
      (prisma.deviceRecord.aggregate as any).mockResolvedValue({ _max: { staticId: 555 } });
      (prisma.deviceRecord.create as any).mockImplementation((args: any) => Promise.resolve({ ...args.data }));

      const client = Client(`http://localhost:${port}`, {
        auth: { token: 'mock' },
        query: { deviceId: 'new-uuid-2' }
      });

      client.on('AUTH_VERIFIED', (res) => {
        expect(res.staticId).toBe('000556');

        expect(prisma.deviceRecord.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { uuid: 'new-uuid-2', staticId: 556 }
          })
        );
        client.close();
        resolve();
      });
    });
  });
});
