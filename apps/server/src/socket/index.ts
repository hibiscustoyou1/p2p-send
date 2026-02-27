import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import {
  SocketEvent,
  JoinRoomPayload,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCICECandidatePayload,
  RoomJoinedPayload,
  PeerJoinedPayload,
  ErrorPayload
} from '@repo/shared';

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*', // 开发环境允许跨域
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // 处理加入房间
    socket.on(SocketEvent.JOIN_ROOM, (payload: JoinRoomPayload) => {
      const { roomId, clientType } = payload;

      // 获取当前房间的信息
      const room = io.sockets.adapter.rooms.get(roomId);
      const numClients = room ? room.size : 0;

      // 房间人数限制为 2
      if (numClients >= 2) {
        const errorPayload: ErrorPayload = {
          code: 'ROOM_FULL',
          message: '房间人数已满，无法加入'
        };
        socket.emit(SocketEvent.ROOM_FULL, errorPayload);
        return;
      }

      // 加入房间
      socket.join(roomId);

      // 记录角色
      socket.data.role = clientType;
      socket.data.roomId = roomId;

      console.log(`[Socket.io] ${clientType} (${socket.id}) joined room ${roomId}`);

      // 查找对端 ID
      let peerId: string | undefined;
      if (room && room.size > 0) {
        for (const clientId of room) {
          if (clientId !== socket.id) {
            peerId = clientId;
            break;
          }
        }
      }

      // 通知当前客户端成功加入房间
      const joinedPayload: RoomJoinedPayload = {
        roomId,
        role: clientType,
        peerId,
        message: '成功加入房间',
      };
      socket.emit(SocketEvent.ROOM_JOINED, joinedPayload);

      // 如果有对端，通知对端有新成员加入
      if (numClients === 1 && peerId) {
        const peerJoinedPayload: PeerJoinedPayload = {
          peerId: socket.id,
          role: clientType
        };
        socket.to(peerId).emit(SocketEvent.PEER_JOINED, peerJoinedPayload);
      }
    });

    // 处理 WebRTC Offer 转发
    socket.on(SocketEvent.WEBRTC_OFFER, (payload: WebRTCOfferPayload) => {
      const { roomId } = payload;
      console.log(`[Socket.io] Forwarding WEBRTC_OFFER in room ${roomId} from ${socket.id}`);
      socket.to(roomId).emit(SocketEvent.WEBRTC_OFFER, payload);
    });

    // 处理 WebRTC Answer 转发
    socket.on(SocketEvent.WEBRTC_ANSWER, (payload: WebRTCAnswerPayload) => {
      const { roomId } = payload;
      console.log(`[Socket.io] Forwarding WEBRTC_ANSWER in room ${roomId} from ${socket.id}`);
      socket.to(roomId).emit(SocketEvent.WEBRTC_ANSWER, payload);
    });

    // 处理 WebRTC ICE 候选者转发
    socket.on(SocketEvent.WEBRTC_ICE_CANDIDATE, (payload: WebRTCICECandidatePayload) => {
      const { roomId } = payload;
      // ICE candidate 的日志比较多，可根据需求自行开启
      // console.log(`[Socket.io] Forwarding ICE_CANDIDATE in room ${roomId} from ${socket.id}`);
      socket.to(roomId).emit(SocketEvent.WEBRTC_ICE_CANDIDATE, payload);
    });

    // 处理主动离开房间
    socket.on(SocketEvent.LEAVE_ROOM, (payload: { roomId: string }) => {
      const { roomId } = payload;
      socket.leave(roomId);
      console.log(`[Socket.io] Client ${socket.id} left room ${roomId}`);
      socket.to(roomId).emit(SocketEvent.PEER_LEFT, { peerId: socket.id });
    })

    // 处理断开连接
    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit(SocketEvent.PEER_LEFT, { peerId: socket.id });
      }
    });
  });

  return io;
}
