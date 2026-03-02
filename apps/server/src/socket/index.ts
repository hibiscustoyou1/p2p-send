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
  DeviceStatusChangedPayload,
  AuthVerifiedPayload
} from '@repo/shared';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ======= 工具：把 100001 格式化为 "100 001" =======
function formatStaticId(id: number): string {
  const str = id.toString();
  // 每 3 个数字插一个空格
  return str.replace(/(.{3})/g, '$1 ').trim();
}

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

  // ========== 阶段四：The Gatekeeper (单节点看门狗) ==========
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const requiredToken = process.env.GLOBAL_ACCESS_TOKEN;

    // 如果服务器没配钥匙，默认直接放行（方便开发）；若配了，强校验。
    if (requiredToken && token !== requiredToken) {
      console.warn(`[Security] 拦截了非法访问 (ID: ${socket.id}, Token 落空)`);
      return next(new Error('Authentication error'));
    }

    next();
  });

  io.on('connection', async (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // --- 阶段四核心：连接一旦准入，客户端必须马上上报自己的 uuid 物理指纹 ---
    const clientUuid = socket.handshake.query.deviceId as string;

    if (clientUuid) {
      try {
        // ========== 使用 Prisma 发号器，如果是查无此人则以自增形式派发 ==========
        let record = await prisma.deviceRecord.findUnique({
          where: { uuid: clientUuid }
        });

        // SQLite 底座是从 0 自增，我们需要将它强行抬起到我们预设的 6 位数 (100000起步)
        if (!record) {
          // 由于 autoincrement() 是系统强制控死行为，我们可先插入，然后如果 id 不合格就手动更新它，或者在此处直接走计数器表查询然后插入固定值。
          // 最轻便做法：查一下表内现有的最大的 staticId，如果有，最大值 + 1；如果没有，就是 100000
          const maxRecord = await prisma.deviceRecord.aggregate({
            _max: { staticId: true }
          });
          const nextStaticId = (maxRecord._max.staticId || 99999) + 1;

          record = await prisma.deviceRecord.create({
            data: {
              uuid: clientUuid,
              staticId: nextStaticId
            }
          });
        }

        const formattedStaticId = formatStaticId(record.staticId);

        // 把长效短号以及设备主锁存入当前 Socket 实例内存，供后续入房时检索
        socket.data.staticId = formattedStaticId;
        socket.data.myDeviceId = clientUuid;

        // 连接即登记在线，不依赖客户端手动打开设备页才触发 DEVICE_ONLINE_CHECK
        onlineDevices.set(clientUuid, socket.id);
        // 如果已有其他客户端订阅了此设备，立即广播上线通知
        subscriptions.forEach((targetsSet, otherSocketId) => {
          if (targetsSet.has(clientUuid)) {
            io.to(otherSocketId).emit(SocketEvent.DEVICE_STATUS_CHANGED, {
              deviceId: clientUuid,
              status: 'online'
            } as DeviceStatusChangedPayload);
          }
        });

        // 打出认证通行与长效指纹分发的最终包
        socket.emit(SocketEvent.AUTH_VERIFIED, {
          staticId: formattedStaticId,
          myDeviceId: clientUuid
        } as AuthVerifiedPayload);

      } catch (err) {
        console.error('[Gatekeeper] Prisma 保存 DeviceRecord 系统故障:', err);
      }
    }

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
      let peerStaticId: string | undefined;

      if (room && room.size > 0) {
        for (const clientId of room) {
          if (clientId !== socket.id) {
            peerId = clientId;
            // 拿到那个已经在房里等我们的人的 Socket 实例，翻出他的长护照
            const peerSocket = io.sockets.sockets.get(clientId);
            if (peerSocket) {
              peerStaticId = peerSocket.data.staticId;
            }
            break;
          }
        }
      }

      // 通知当前客户端成功加入房间
      const joinedPayload: RoomJoinedPayload = {
        roomId,
        role: clientType,
        peerId,
        peerStaticId,
        peerDeviceId: peerId ? io.sockets.sockets.get(peerId)?.data.myDeviceId : undefined,
        message: '成功加入房间',
      };
      socket.emit(SocketEvent.ROOM_JOINED, joinedPayload);

      // 如果有对端，通知对端有新成员加入
      if (numClients === 1 && peerId) {
        const peerJoinedPayload: PeerJoinedPayload = {
          peerId: socket.id,
          peerStaticId: socket.data.staticId,
          peerDeviceId: socket.data.myDeviceId,
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
