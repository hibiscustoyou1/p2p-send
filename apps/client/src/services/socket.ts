import { io, Socket } from 'socket.io-client';
import { SocketEvent } from '@repo/shared';
import type {
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
import { settingsManager } from './settingsManager';

declare const API_PORT: string;

/**
 * 获取或生成当前设备的长效物理指纹
 */
export function getMyDeviceId(): string {
  let id = localStorage.getItem('my_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('my_device_id', id);
  }
  return id;
}

// 单例模式，保证全局唯一的信令通道
class SignalingService {
  public socket: Socket | null = null;
  private serverUrl = `http://localhost:${API_PORT}`;
  public roomId: string | null = null;
  public role: 'sender' | 'receiver' | null = null;
  public peerId: string | null = null;
  public peerStaticId: string | null = null;
  public peerDeviceId: string | null = null; // 对端的长效 UUID（用于设备刘在线状态查询的正确主键）
  private queuedListeners: Array<{ event: string, callback: any }> = [];
  public authPayload: AuthVerifiedPayload | null = null;

  /**
   * 建立与服务端的 Socket.io 链接
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }

      if (!this.socket) {
        // 第一期建联
        this.socket = io(this.serverUrl, {
          auth: {
            token: settingsManager.getAccessToken() // 护城河口令
          },
          query: {
            deviceId: getMyDeviceId() // 长效标识
          }
        });

        // 绑定全局一次性的监控分发兜底
        this.socket.on('connect_error', (err) => {
          console.error('[Signaling] 连接信令服务器失败:', err.message);
          // 推送到上游门卫拦截窗
          if (this.connectErrorCallback) {
            this.connectErrorCallback(err);
          }
        });

        // 内部静默截获一次鉴权响应以供单例生命周期缓存
        this.socket.on(SocketEvent.AUTH_VERIFIED, (payload: AuthVerifiedPayload) => {
          this.authPayload = payload;
        });

        this._applyQueuedListeners();
      } else {
        // 后续重连：不要重新 io() 以免丢弃其他视图绑定的事件钩子
        (this.socket.auth as any).token = settingsManager.getAccessToken();
        (this.socket.io.opts.query as any) = { ...(this.socket.io.opts.query || {}), deviceId: getMyDeviceId() };
        this.socket.connect();
      }

      // 用作本次 Promise 链的临时监控
      const onConnect = () => {
        console.log('[Signaling] 已成功连接到信令服务器', this.socket?.id);
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);
    });
  }

  // --- 提供给顶级视图 (App.vue) 拉起强制入场的 Error Hook ---
  private connectErrorCallback: ((err: Error) => void) | null = null;
  public onConnectError(cb: (err: Error) => void) {
    this.connectErrorCallback = cb;
  }

  /**
   * 断开连接
   */
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.queuedListeners = [];
    this.authPayload = null;
  }

  /**
   * 加入六位房间号组建 P2P 两端网络
   */
  public joinRoom(roomId: string, role: 'sender' | 'receiver'): Promise<RoomJoinedPayload> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Socket 不存在，请先 connect()'));
      }

      const payload: JoinRoomPayload = { roomId, clientType: role };
      this.socket.emit(SocketEvent.JOIN_ROOM, payload);

      // 单次监听加入成功事件
      this.socket.once(SocketEvent.ROOM_JOINED, (res: RoomJoinedPayload) => {
        this.roomId = res.roomId;
        this.role = res.role;
        this.peerId = res.peerId || null;
        this.peerStaticId = res.peerStaticId || null;
        this.peerDeviceId = res.peerDeviceId || null;
        resolve(res);
      });

      // 监听房间爆满错误
      this.socket.once(SocketEvent.ROOM_FULL, (err: ErrorPayload) => {
        reject(new Error(err.message));
      });
    });
  }

  public leaveRoom(roomId: string) {
    if (!this.socket) return;
    this.socket.emit(SocketEvent.LEAVE_ROOM, { roomId });
    this.roomId = null;
    this.role = null;
    this.peerId = null;
    this.peerStaticId = null;
    this.peerDeviceId = null;
  }

  // --- 发送/转发事件 ---
  public sendWebRTCOffer(offer: RTCSessionDescriptionInit) {
    if (!this.socket || !this.roomId) return;
    const payload: WebRTCOfferPayload = { roomId: this.roomId, sdp: offer };
    this.socket.emit(SocketEvent.WEBRTC_OFFER, payload);
  }

  public sendWebRTCAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.socket || !this.roomId) return;
    const payload: WebRTCAnswerPayload = { roomId: this.roomId, sdp: answer };
    this.socket.emit(SocketEvent.WEBRTC_ANSWER, payload);
  }

  public sendICECandidate(candidate: RTCIceCandidateInit) {
    if (!this.socket || !this.roomId) return;
    const payload: WebRTCICECandidatePayload = { roomId: this.roomId, candidate };
    this.socket.emit(SocketEvent.WEBRTC_ICE_CANDIDATE, payload);
  }

  // --- 订阅事件 ---

  // 内部：清空并在实例化好的 socket 上补偿全部脱机挂载点
  public _applyQueuedListeners() {
    if (!this.socket) return;
    for (const { event, callback } of this.queuedListeners) {
      // 避免重复绑定，这里由于是刚实例化，一般不会重复
      this.socket.on(event, callback);
    }
  }

  // 监听对端由于晚加入而触发的联通告知
  public onPeerJoined(callback: (payload: PeerJoinedPayload) => void) {
    if (!this.socket) {
      this.queuedListeners.push({ event: SocketEvent.PEER_JOINED, callback: (p: any) => { this.peerId = p.peerId; this.peerStaticId = p.peerStaticId || null; callback(p); } });
      return;
    }
    this.socket.on(SocketEvent.PEER_JOINED, (payload) => {
      this.peerId = payload.peerId;
      this.peerStaticId = payload.peerStaticId || null;
      this.peerDeviceId = payload.peerDeviceId || null;
      callback(payload);
    });
  }

  public onPeerLeft(callback: (peerId: string) => void) {
    if (!this.socket) {
      this.queuedListeners.push({ event: SocketEvent.PEER_LEFT, callback: (p: any) => { if (this.peerId === p.peerId) { this.peerId = null; this.peerStaticId = null; } callback(p.peerId); } });
      return;
    }
    this.socket.on(SocketEvent.PEER_LEFT, (payload: { peerId: string }) => {
      if (this.peerId === payload.peerId) {
        this.peerId = null;
        this.peerStaticId = null;
      }
      callback(payload.peerId);
    });
  }

  public onWebRTCOffer(callback: (payload: WebRTCOfferPayload) => void) {
    if (!this.socket) {
      this.queuedListeners.push({ event: SocketEvent.WEBRTC_OFFER, callback });
      return;
    }
    this.socket.on(SocketEvent.WEBRTC_OFFER, callback);
  }

  public onWebRTCAnswer(callback: (payload: WebRTCAnswerPayload) => void) {
    if (!this.socket) {
      this.queuedListeners.push({ event: SocketEvent.WEBRTC_ANSWER, callback });
      return;
    }
    this.socket.on(SocketEvent.WEBRTC_ANSWER, callback);
  }

  public onICECandidate(callback: (payload: WebRTCICECandidatePayload) => void) {
    if (!this.socket) {
      this.queuedListeners.push({ event: SocketEvent.WEBRTC_ICE_CANDIDATE, callback });
      return;
    }
    this.socket.on(SocketEvent.WEBRTC_ICE_CANDIDATE, callback);
  }

  // --- 阶段四：私有号段发放钩子 ---
  public onAuthVerified(callback: (payload: any) => void) {
    if (this.authPayload) {
      // 已经连接并获取过 ID 时直接无感回传缓存供视图复建
      callback(this.authPayload);
    }
    if (!this.socket) {
      this.queuedListeners.push({ event: SocketEvent.AUTH_VERIFIED, callback });
      return;
    }
    this.socket.on(SocketEvent.AUTH_VERIFIED, callback);
  }

  public offAuthVerified(callback: (payload: any) => void) {
    if (!this.socket) {
      this.queuedListeners = this.queuedListeners.filter(q => q.event !== SocketEvent.AUTH_VERIFIED || q.callback !== callback);
      return;
    }
    this.socket.off(SocketEvent.AUTH_VERIFIED, callback);
  }

  // --- 阶段三：长效通信大厅 ---
  public checkDeviceOnlineStatus(targetIds: string[]) {
    if (!this.socket) return;
    const payload: DeviceOnlineCheckPayload = {
      myDeviceId: getMyDeviceId(),
      targetIds
    };
    this.socket.emit(SocketEvent.DEVICE_ONLINE_CHECK, payload);
  }

  public onDeviceStatusChanged(callback: (payload: DeviceStatusChangedPayload) => void) {
    if (!this.socket) {
      this.queuedListeners.push({ event: SocketEvent.DEVICE_STATUS_CHANGED, callback });
      return;
    }
    this.socket.on(SocketEvent.DEVICE_STATUS_CHANGED, callback);
  }

  // 清理所有的业务监听器防止内存泄露
  public clearListeners() {
    if (!this.socket) return;
    this.socket.off(SocketEvent.PEER_JOINED);
    this.socket.off(SocketEvent.PEER_LEFT);
    this.socket.off(SocketEvent.WEBRTC_OFFER);
    this.socket.off(SocketEvent.WEBRTC_ANSWER);
    this.socket.off(SocketEvent.WEBRTC_ICE_CANDIDATE);
    this.socket.off(SocketEvent.DEVICE_STATUS_CHANGED);
  }
}

// 暴露出全局单例句柄
export const signalingService = new SignalingService();
