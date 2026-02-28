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
  ErrorPayload,
  DeviceOnlineCheckPayload,
  DeviceStatusChangedPayload
} from '@repo/shared';

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*', // 开发环境允许跨域
      methods: ['GET', 'POST']
    }
  });

  // ========== 阶段三：长效设备心跳与在线探测器 ==========
  // 存放当前所有长连接在线中的终端 deviceId -> socket.id 映射
  const onlineDevices = new Map<string, string>();
  // 存放某个 socket 想要订阅知道哪些设备（targetIds）的上下线动作 socket.id -> Set<targetDeviceId>
  const subscriptions = new Map<string, Set<string>>();

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // --- 阶段三核心：接受前端发来的心跳查询与订阅诉求 ---
    socket.on(SocketEvent.DEVICE_ONLINE_CHECK, (payload: DeviceOnlineCheckPayload) => {
      const { myDeviceId, targetIds } = payload;

      // 1. 记录当事人（自己）到公屏大厅
      onlineDevices.set(myDeviceId, socket.id);
      socket.data.myDeviceId = myDeviceId;

      // 2. 存入它的关注列表
      subscriptions.set(socket.id, new Set(targetIds));

      // 3. 立即响应：将所有它关注的人中，此时在线的立刻打回一个 DEVICE_STATUS_CHANGED 联波
      targetIds.forEach(targetId => {
        if (onlineDevices.has(targetId)) {
          socket.emit(SocketEvent.DEVICE_STATUS_CHANGED, {
            deviceId: targetId,
            status: 'online'
          } as DeviceStatusChangedPayload);
        }
      });

      // 4. 反向操作：因为“我”（myDeviceId）上线了，有可能大厅里其实也有别人在偷偷关注我，在这里触发反向播报
      subscriptions.forEach((targetsSet, otherSocketId) => {
        if (otherSocketId !== socket.id && targetsSet.has(myDeviceId)) {
          io.to(otherSocketId).emit(SocketEvent.DEVICE_STATUS_CHANGED, {
            deviceId: myDeviceId,
            status: 'online'
          } as DeviceStatusChangedPayload);
        }
      });
    });

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

      // 传统房间短联处理
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit(SocketEvent.PEER_LEFT, { peerId: socket.id });
      }

      // --- 大厅探活断线扫尾清理 ---
      const myDeviceId = socket.data.myDeviceId;
      if (myDeviceId) {
        onlineDevices.delete(myDeviceId);
        // 既然“我”走了，如果有谁还在关注着我，告诉他们我离线了
        subscriptions.forEach((targetsSet, otherSocketId) => {
          if (targetsSet.has(myDeviceId)) {
            io.to(otherSocketId).emit(SocketEvent.DEVICE_STATUS_CHANGED, {
              deviceId: myDeviceId,
              status: 'offline'
            } as DeviceStatusChangedPayload);
          }
        });
      }
      subscriptions.delete(socket.id);
    });
  });

  return io;
}
