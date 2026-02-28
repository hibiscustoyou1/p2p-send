/**
 * 共享数据模型：Socket.io 事件枚举与通信载荷
 * @repo/shared/src/common/socket.ts
 */

// 为跨端共享声明简单的 WebRTC 基础载荷类型，避免后端缺少 DOM 类型报错
export interface RTCSessionDescriptionInitCompat {
  type: "answer" | "offer" | "pranswer" | "rollback";
  sdp?: string;
}

export interface RTCIceCandidateInitCompat {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}


/**
 * Socket.io 核心事件枚举
 */
export enum SocketEvent {
  // --- 客户端 -> 服务端 发出 ---
  /**
   * 客户端请求加入/创建一个房间（通过6位邀请码）
   */
  JOIN_ROOM = 'JOIN_ROOM',

  /**
   * 发送端发起 WebRTC Offer
   */
  WEBRTC_OFFER = 'WEBRTC_OFFER',

  /**
   * 接收端回复 WebRTC Answer
   */
  WEBRTC_ANSWER = 'WEBRTC_ANSWER',

  /**
   * 任何一端发送 ICE 候选者
   */
  WEBRTC_ICE_CANDIDATE = 'WEBRTC_ICE_CANDIDATE',

  /**
   * 主动离开房间
   */
  LEAVE_ROOM = 'LEAVE_ROOM',


  // --- 服务端 -> 客户端 推送 ---
  /**
   * 成功加入房间
   */
  ROOM_JOINED = 'ROOM_JOINED',

  /**
   * 对端加入了房间（触发接收端准备或发送端发起Offer）
   */
  PEER_JOINED = 'PEER_JOINED',

  /**
   * 对端离开了房间
   */
  PEER_LEFT = 'PEER_LEFT',

  /**
   * 房间已满（错误拦截）
   */
  ROOM_FULL = 'ROOM_FULL',

  /**
   * 房间不存在或邀请码错误（错误拦截）
   */
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',

  /**
   * 通用错误提示
   */
  ERROR = 'ERROR',

  // --- 阶段三设备留用管理：全双工在线状态监听 ---

  /**
   * 客户端发送给服务端：声明自己的永久 ID 并索要一篮子信任设备的在线状况
   */
  DEVICE_ONLINE_CHECK = 'DEVICE_ONLINE_CHECK',

  /**
   * 服务端广播给客户端：某设备的在线或离线状态变更通知
   */
  DEVICE_STATUS_CHANGED = 'DEVICE_STATUS_CHANGED'
}

/**
 * JOIN_ROOM 载荷
 */
export interface JoinRoomPayload {
  roomId: string; // 即6位邀请码
  clientType: 'sender' | 'receiver';
}

/**
 * WEBRTC_OFFER 载荷
 */
export interface WebRTCOfferPayload {
  roomId: string;
  sdp: RTCSessionDescriptionInitCompat;
}

/**
 * WEBRTC_ANSWER 载荷
 */
export interface WebRTCAnswerPayload {
  roomId: string;
  sdp: RTCSessionDescriptionInitCompat;
}

/**
 * WEBRTC_ICE_CANDIDATE 载荷
 */
export interface WebRTCICECandidatePayload {
  roomId: string;
  candidate: RTCIceCandidateInitCompat | null;
}

/**
 * ROOM_JOINED 载荷 (S -> C)
 */
export interface RoomJoinedPayload {
  roomId: string;
  role: 'sender' | 'receiver';
  peerId?: string; // 如果加入时对端已经在房间中，返回其 socket ID
  message: string;
}

/**
 * PEER_JOINED 载荷 (S -> C)
 */
export interface PeerJoinedPayload {
  peerId: string;
  role: 'sender' | 'receiver';
}

/**
 * ERROR_PAYLOAD (S -> C)
 */
export interface ErrorPayload {
  code: string;
  message: string;
}

/**
 * DEVICE_ONLINE_CHECK (C -> S)
 * Client 端在上机后发送此包索要目标列表，并建立推送订阅
 */
export interface DeviceOnlineCheckPayload {
  myDeviceId: string;     // 自己设备的长期唯一标符
  targetIds: string[];    // 我关心的其它曾经信任过我的设备名册
}

/**
 * DEVICE_STATUS_CHANGED (S -> C)
 * Backend 路由发生设备大厅变动时，定向推给关心它的人
 */
export interface DeviceStatusChangedPayload {
  deviceId: string;
  status: 'online' | 'offline';
}
