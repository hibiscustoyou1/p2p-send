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

// ======= 工具：把整数格式化为 6 位补零字符串（如 1 → "000001"）=======
function formatStaticId(id: number): string {
  return id.toString().padStart(6, '0');
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

        // 发号策略：6 位补零，从 000000 起步，自增不限上限
        if (!record) {
          // 查当前表内最大 staticId，有则 +1；无则从 0（即 "000000"）起步
          const maxRecord = await prisma.deviceRecord.aggregate({
            _max: { staticId: true }
          });
          const nextStaticId = (maxRecord._max.staticId ?? -1) + 1;

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

        // ======== 动态下发 WebRTC 穿透配置 (包含 TURN 时效签名支持) ========
        let iceServers: any[] = [{ urls: 'stun:stun.l.google.com:19302' }];

        // 方案 1: 高级动态安全方案 - 基于 coturn 的 use-auth-secret 机制发号
        const turnUrl = process.env.TURN_URL;
        const turnSecret = process.env.TURN_SECRET;
        if (turnUrl && turnSecret) {
          const crypto = require('crypto'); // 此处仅在服务端连接发生时使用原生包
          const ttlSeconds = 24 * 3600; // 票据 24 小时存活期
          const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
          // username 格式要求为: 时间戳:终端标识
          const turnUsername = `${timestamp}:${clientUuid}`;
          // HMAC-SHA1 签名
          const hmac = crypto.createHmac('sha1', turnSecret);
          hmac.update(turnUsername);
          const turnCredential = hmac.digest('base64');

          // 把我们通过自己秘钥计算出的限时通行证下发给客户端
          iceServers.push({
            urls: turnUrl,
            username: turnUsername,
            credential: turnCredential
          });
        }
        // 方案 2: 向后兼容的静态 JSON 方案
        else {
          try {
            if (process.env.ICE_SERVERS_JSON) {
              iceServers = JSON.parse(process.env.ICE_SERVERS_JSON);
            }
          } catch (e) {
            console.error('[WebRTC] ICE_SERVERS_JSON 解析失败:', e);
          }
        }

        // 打出认证通行与长效指纹分发、冰山穿透凭证的最终包
        socket.emit(SocketEvent.AUTH_VERIFIED, {
          staticId: formattedStaticId,
          myDeviceId: clientUuid,
          iceServers
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
