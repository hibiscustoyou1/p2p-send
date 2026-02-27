import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { setupSocket } from '../index';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { SocketEvent, RoomJoinedPayload } from '@repo/shared';

describe('Socket Signaling Server', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: ClientSocket;
  let clientSocket2: ClientSocket;
  let clientSocket3: ClientSocket;
  let httpServer: HttpServer;
  let port: number;

  beforeAll(async () => {
    httpServer = createServer();
    io = setupSocket(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as any).port;
        clientSocket = Client(`http://localhost:${port}`);
        clientSocket2 = Client(`http://localhost:${port}`);
        clientSocket3 = Client(`http://localhost:${port}`);
        io.on('connection', (socket) => {
          serverSocket = socket;
        });
        Promise.all([
          new Promise(r => clientSocket.on('connect', r)),
          new Promise(r => clientSocket2.on('connect', r)),
          new Promise(r => clientSocket3.on('connect', r)),
        ]).then(() => resolve());
      });
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    clientSocket2.close();
    clientSocket3.close();
    httpServer.close();
  });

  it('should allow first user to join as sender', () => {
    return new Promise<void>((resolve) => {
      const roomId = 'test-room';
      clientSocket.emit(SocketEvent.JOIN_ROOM, { roomId, clientType: 'sender' });

      clientSocket.on(SocketEvent.ROOM_JOINED, (payload: RoomJoinedPayload) => {
        expect(payload.roomId).toBe(roomId);
        expect(payload.role).toBe('sender');
        resolve();
      });
    });
  });

  it('should allow second user to join as receiver and emit peer-joined', () => {
    return new Promise<void>((resolve) => {
      const roomId = 'test-room';

      // 我们设置 client 1 (sender) 等待 peer-joined
      clientSocket.on(SocketEvent.PEER_JOINED, (payload) => {
        expect(payload.peerId).toBeDefined();
        resolve();
      });

      // 第二个客户端加入
      clientSocket2.emit(SocketEvent.JOIN_ROOM, { roomId, clientType: 'receiver' });
    });
  });
});
