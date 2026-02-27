import { io, Socket } from 'socket.io-client';
import { SocketEvent } from '@repo/shared';
import type {
  JoinRoomPayload,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  WebRTCICECandidatePayload,
  RoomJoinedPayload,
  PeerJoinedPayload,
  ErrorPayload
} from '@repo/shared';

declare const API_PORT: string;

// 单例模式，保证全局唯一的信令通道
class SignalingService {
  private socket: Socket | null = null;
  private serverUrl = `http://localhost:${API_PORT}`;
  public roomId: string | null = null;
  public role: 'sender' | 'receiver' | null = null;
  public peerId: string | null = null;

  /**
   * 建立与服务端的 Socket.io 链接
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }

      this.socket = io(this.serverUrl);

      this.socket.on('connect', () => {
        console.log('[Signaling] 已成功连接到信令服务器', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error('[Signaling] 连接信令服务器失败:', err.message);
        reject(err);
      });
    });
  }

  /**
   * 断开连接
   */
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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

  // 监听对端由于晚加入而触发的联通告知
  public onPeerJoined(callback: (payload: PeerJoinedPayload) => void) {
    if (!this.socket) return;
    this.socket.on(SocketEvent.PEER_JOINED, (payload) => {
      this.peerId = payload.peerId;
      callback(payload);
    });
  }

  public onPeerLeft(callback: (peerId: string) => void) {
    if (!this.socket) return;
    this.socket.on(SocketEvent.PEER_LEFT, (payload: { peerId: string }) => {
      if (this.peerId === payload.peerId) {
        this.peerId = null;
      }
      callback(payload.peerId);
    });
  }

  public onWebRTCOffer(callback: (payload: WebRTCOfferPayload) => void) {
    if (!this.socket) return;
    this.socket.on(SocketEvent.WEBRTC_OFFER, callback);
  }

  public onWebRTCAnswer(callback: (payload: WebRTCAnswerPayload) => void) {
    if (!this.socket) return;
    this.socket.on(SocketEvent.WEBRTC_ANSWER, callback);
  }

  public onICECandidate(callback: (payload: WebRTCICECandidatePayload) => void) {
    if (!this.socket) return;
    this.socket.on(SocketEvent.WEBRTC_ICE_CANDIDATE, callback);
  }

  // 清理所有的业务监听器防止内存泄露
  public clearListeners() {
    if (!this.socket) return;
    this.socket.off(SocketEvent.PEER_JOINED);
    this.socket.off(SocketEvent.PEER_LEFT);
    this.socket.off(SocketEvent.WEBRTC_OFFER);
    this.socket.off(SocketEvent.WEBRTC_ANSWER);
    this.socket.off(SocketEvent.WEBRTC_ICE_CANDIDATE);
  }
}

// 暴露出全局单例句柄
export const signalingService = new SignalingService();
