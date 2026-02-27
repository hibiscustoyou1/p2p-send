import { signalingService } from './socket';

export type WebRTCState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

// 在我们应用中需要的事件管理
type EventMap = {
  'stateChange': (state: WebRTCState) => void;
  'dataChannelOpen': (channel: RTCDataChannel) => void;
  'dataChannelClose': () => void;
  'error': (err: Error) => void;
};

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private role: 'sender' | 'receiver';

  private listeners: { [K in keyof EventMap]?: Array<EventMap[K]> } = {};

  // Google 提供的免费穿透测试服务器，以及如果需要的话可以放企业级 TURN
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  constructor(role: 'sender' | 'receiver') {
    this.role = role;
  }

  // 构建核心连接模型
  public init() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    // 监控整体 P2P 的网络穿透或互联状态
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state) {
        console.log(`[WebRTC] Connection state changed to: ${state}`);
        this.emit('stateChange', state as WebRTCState);
      }
    };

    // 只要本地采集到 ICE Candidate (本地公网/内网打洞凭证)，就塞进 Socket 发给对端去尝试连接
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingService.sendICECandidate(event.candidate);
      }
    };

    // 发送方业务：主动打通一条信道给接收方
    if (this.role === 'sender') {
      // 必须在 setLocalDescription! 与建立 Offer! 之前先 createDataChannel
      this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
        ordered: true, // 确保切片顺序
      });
      this.setupDataChannelBindings();
    }
    // 接收方业务：监听对方把通道拉过来
    else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannelBindings();
      };
    }

    // --- 监听信令回调并处理 (这部分是将 socket 收到的对方口令写入 peer 的底层核心) --- 
    signalingService.onWebRTCOffer(async ({ sdp }) => {
      if (this.role === 'receiver' && this.peerConnection) {
        try {
          // 接纳 Offer
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
          // 制造 Answer
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          // 丢给对端
          signalingService.sendWebRTCAnswer(answer);
        } catch (err: any) {
          this.emit('error', err);
        }
      }
    });

    signalingService.onWebRTCAnswer(async ({ sdp }) => {
      if (this.role === 'sender' && this.peerConnection) {
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err: any) {
          this.emit('error', err);
        }
      }
    });

    signalingService.onICECandidate(async ({ candidate }) => {
      // 在两边互相交换完了 Offer/Answer 后，双方会把手里的局域网/STUN打洞地址扔个对方去连接
      if (candidate && this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC] 加载 ICE Candidate 失败', e);
        }
      }
    });
  }

  // 为通道包裹基础侦听
  private setupDataChannelBindings() {
    if (!this.dataChannel) return;

    // 设置接受数据为 arraybuffer 格式
    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      console.log(`[WebRTC DataChannel] Open!`);
      this.emit('dataChannelOpen', this.dataChannel!);
    };

    this.dataChannel.onclose = () => {
      console.log(`[WebRTC DataChannel] Closed!`);
      this.emit('dataChannelClose');
    };

    this.dataChannel.onerror = (evt) => {
      console.error('[WebRTC DataChannel] Error', evt);
      this.emit('error', new Error('DataChannel error occurred'));
    }
  }

  // 发送者专属方法：主动向对面弹射呼叫
  public async call() {
    if (this.role !== 'sender' || !this.peerConnection) return;
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      signalingService.sendWebRTCOffer(offer);
    } catch (err: any) {
      this.emit('error', err);
    }
  }

  // 获取通信频道
  public getChannel() {
    return this.dataChannel;
  }

  // 关闭销毁全部链接
  public close() {
    signalingService.clearListeners();
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  // 简化的 Emitter 系统
  public on<K extends keyof EventMap>(evt: K, cb: EventMap[K]) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt]!.push(cb);
  }

  public off<K extends keyof EventMap>(evt: K, cb: EventMap[K]) {
    if (!this.listeners[evt]) return;
    this.listeners[evt] = this.listeners[evt]!.filter(f => f !== cb) as any;
  }

  private emit<K extends keyof EventMap>(evt: K, ...args: Parameters<EventMap[K]>) {
    if (this.listeners[evt]) {
      this.listeners[evt]!.forEach(cb => (cb as Function)(...args));
    }
  }
}
