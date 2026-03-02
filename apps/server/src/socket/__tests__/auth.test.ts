import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { setupSocket } from '../index';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { SocketEvent, AuthVerifiedPayload } from '@repo/shared';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
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

describe('Socket Server - Gatekeeper & Auth Routing', () => {
  let io: Server;
  let httpServer: HttpServer;
  let port: number;
  let originalToken: string | undefined;

  beforeAll(async () => {
    originalToken = process.env.GLOBAL_ACCESS_TOKEN;
    process.env.GLOBAL_ACCESS_TOKEN = 'test-secret-123';

    httpServer = createServer();
    io = setupSocket(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    process.env.GLOBAL_ACCESS_TOKEN = originalToken;
    io.close();
    httpServer.close();
    vi.restoreAllMocks();
  });

  it('[Gatekeeper] should reject connection without token or invalid token', () => {
    return new Promise<void>((resolve) => {
      const client = Client(`http://localhost:${port}`);
      client.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication error');
        client.close();
        resolve();
      });
      client.on('connect', () => {
        client.close();
        throw new Error('Should not connect without token');
      });
    });
  });

  it('[Gatekeeper] should accept connection with valid token but no deviceId', () => {
    return new Promise<void>((resolve) => {
      const client = Client(`http://localhost:${port}`, {
        auth: { token: 'test-secret-123' }
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.close();
        resolve();
      });

      client.on('connect_error', (err) => {
        client.close();
        throw err;
      });
    });
  });

  it('[Gatekeeper] should emit AUTH_VERIFIED with formatted ID and pass queries when deviceId exists', () => {
    return new Promise<void>((resolve) => {
      const prisma = new PrismaClient();
      (prisma.deviceRecord.findUnique as any).mockResolvedValue({
        uuid: 'dev_mock_uuid',
        staticId: 1
      });

      const client = Client(`http://localhost:${port}`, {
        auth: { token: 'test-secret-123' },
        query: { deviceId: 'dev_mock_uuid' }
      });

      client.on(SocketEvent.AUTH_VERIFIED, (payload: AuthVerifiedPayload) => {
        expect(payload.staticId).toBe('000001');
        expect(payload.myDeviceId).toBe('dev_mock_uuid');
        client.close();
        resolve();
      });

      client.on('connect_error', (err) => {
        client.close();
        throw err;
      });
    });
  });
});
