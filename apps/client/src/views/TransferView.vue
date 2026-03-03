<template>
  <!-- 传输视图 -->
  <div class="relative z-10 p-8 max-w-6xl mx-auto w-full flex flex-col gap-8 fade-in">
    <!-- 连接面板子组件 -->
    <ConnectionPanel :deviceCode="deviceCode" @connect="onConnect" />

    <!-- ====== 空状态：等待连接（无任何 P2P 连接时占满剩余空间） ====== -->
    <div v-if="connectionStatus === 'disconnected'"
      class="idle-container flex-1 flex flex-col items-center justify-center py-10 gap-10 select-none">

      <!-- 雷达脉冲图区 -->
      <div class="radar-wrapper relative flex items-center justify-center">
        <!-- 三层脉冲环 -->
        <span class="pulse-ring ring-1"></span>
        <span class="pulse-ring ring-2"></span>
        <span class="pulse-ring ring-3"></span>

        <!-- 核心图标容器 -->
        <div class="core-icon relative z-10 flex items-center justify-center
                    h-20 w-20 rounded-full bg-white dark:bg-slate-900
                    border-2 border-primary/30 dark:border-primary/40
                    shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_8px_32px_rgba(59,130,246,0.18)]
                    dark:shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_8px_32px_rgba(59,130,246,0.25)]">
          <!-- 信号扫描图标：来自 assets/images/svgs/signal_scan.svg -->
          <SvgIcon name="signal_scan" class="text-primary text-5xl" />
        </div>
      </div>

      <!-- 标题与副标题 -->
      <div class="text-center flex flex-col gap-2 max-w-sm">
        <h2 class="text-slate-800 dark:text-slate-100 text-2xl font-bold tracking-tight">
          等待安全连接
        </h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          分享您的连接码给对方，<br>
          或输入对方的连接码发起配对。
        </p>
      </div>

      <!-- 三步引导说明卡 -->
      <div class="steps-grid grid grid-cols-3 gap-4 w-full max-w-2xl">
        <div v-for="step in idleSteps" :key="step.num" class="step-card glass-panel rounded-xl p-4 flex flex-col gap-2.5
                 border border-slate-200/60 dark:border-slate-700/40
                 hover:border-primary/30 dark:hover:border-primary/40
                 hover:shadow-[0_4px_20px_rgba(59,130,246,0.08)]
                 transition-all duration-300 group">
          <div class="flex items-center gap-2.5">
            <span class="flex h-6 w-6 items-center justify-center rounded-full
                         bg-primary/10 dark:bg-primary/20
                         text-primary text-xs font-bold
                         group-hover:bg-primary/20 dark:group-hover:bg-primary/30
                         transition-colors duration-300">
              {{ step.num }}
            </span>
            <span class="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">
              {{ step.label }}
            </span>
          </div>
          <p class="text-slate-500 dark:text-slate-400 text-xs leading-relaxed pl-0.5">
            {{ step.desc }}
          </p>
        </div>
      </div>

      <!-- 底部装饰分隔线 -->
      <div class="idle-divider flex items-center gap-3 w-full max-w-xs opacity-40">
        <div class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-500 to-transparent">
        </div>
        <SvgIcon name="lock" class="text-slate-400 dark:text-slate-500 text-base" />
        <div class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-500 to-transparent">
        </div>
      </div>
    </div>

    <!-- 状态面板 (连接建立后显示) -->
    <div v-if="connectionStatus !== 'disconnected'"
      class="glass-panel p-4 rounded-xl flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div :class="[
          'h-3 w-3 rounded-full shadow-lg',
          connectionStatus === 'connected' ? 'bg-accent-success shadow-accent-success/50' : 'bg-accent-warning shadow-accent-warning/50 animate-pulse'
        ]"></div>
        <span class="text-slate-700 dark:text-slate-300 font-medium">
          {{ connectionStatus === 'connected' ? '与对端设备连接成功，可以开始传输体验！' : '正在建立安全 P2P 隧道...' }}
        </span>
      </div>
      <div class="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 font-mono shadow-inner">
        Role: {{ currentRole }}
      </div>
    </div>

    <!-- 拖拽上传子组件 (建联成功，或者是作为发送方时才能操作) -->
    <UploadZone v-if="connectionStatus === 'connected' && currentRole === 'sender'" @files-selected="onFilesSelected" />

    <!-- 活动传输列表渲染 (如果没有任务则不展示) -->
    <TransferList v-if="transferTasks.length > 0" :activeCount="activeCount" @view-all="onViewAll">
      <TransferCard v-for="task in transferTasks" :key="task.id" :id="task.id" :filename="task.filename"
        :totalBytes="task.totalBytes" :transferredBytes="task.transferredBytes" :speed="task.speed"
        :estimatedTime="task.estimatedTime" :status="task.status" @pause="handlePause(task.id)"
        @resume="handleResume(task.id)" @cancel="handleCancel(task.id)" />
    </TransferList>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import ConnectionPanel from '@/components/transfer/ConnectionPanel.vue';
import UploadZone from '@/components/transfer/UploadZone.vue';
import TransferList from '@/components/transfer/TransferList.vue';
import TransferCard from '@/components/transfer/TransferCard.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { TransferEngine, FileReceiverEngine, type TransferProgress, type __BaseEngine } from '@/services/fileTransfer';
import { signalingService, getMyDeviceId } from '@/services/socket';
import { WebRTCManager } from '@/services/webrtc';
import { deviceManager } from '@/services/deviceManager';

// ========== 空状态引导步骤 ==========
const idleSteps = [
  {
    num: '1',
    label: '获取连接码',
    desc: '页面顶部展示您的专属 6 位连接码，对方需凭此码与您配对。'
  },
  {
    num: '2',
    label: '建立配对',
    desc: '将连接码告知对方，或输入对方的连接码，点击连接发起配对请求。'
  },
  {
    num: '3',
    label: '安全传输',
    desc: 'P2P 隧道建立后，拖入文件即可开始端到端加密的直接传输。'
  }
];

// ========== 连接区域状态 ==========
const deviceCode = ref('获 取 中 ...');
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
const currentRole = ref<'sender' | 'receiver'>('sender');

let webrtcManager: WebRTCManager | null = null;
let activeReceiver: FileReceiverEngine | null = null;

const handleAuthVerified = (payload: any) => {
  deviceCode.value = payload.staticId;
  currentRole.value = 'sender'; // 我们目前在自己界面就是待机发送者
  signalingService.joinRoom(payload.staticId.replace(/\s+/g, ''), 'sender').catch(err => console.error(err));
  initWebRTCManager('sender');
};

onMounted(async () => {
  // 阶段四：清空原先纯前端的自增房管，完全听令于大厅发号系统
  try {
    // 优雅接听，直接用 services/socket.ts 暴露的方法去注册
    signalingService.onAuthVerified(handleAuthVerified);

    await signalingService.connect();

  } catch (err) {
    console.error('初始化信令错误', err);
    deviceCode.value = '连 接 失 败';
  }
});

const initWebRTCManager = (role: 'sender' | 'receiver') => {
  if (webrtcManager) webrtcManager.close();

  webrtcManager = new WebRTCManager(role);

  webrtcManager.on('stateChange', (state) => {
    if (state === 'connected') {
      connectionStatus.value = 'connected';
      // 使用对端的 UUID（peerDeviceId）作为唯一设备 ID，而非静态短号（peerStaticId）
      // 原因：服务端 onlineDevices Map 以 UUID 为键，用短号查询永远 miss 导致永远离线
      if (signalingService.peerDeviceId) {
        deviceManager.upsertDevice({
          id: signalingService.peerDeviceId,
          originalName: `Device ${signalingService.peerStaticId ?? signalingService.peerDeviceId}`,
          deviceType: 'unknown',
          lastSeen: Date.now()
        });
      }
    }
    else if (state === 'connecting' || state === 'new') connectionStatus.value = 'connecting';
    else connectionStatus.value = 'disconnected';
  });

  webrtcManager.on('dataChannelOpen', (channel) => {
    connectionStatus.value = 'connected';

    // 挂载数据通道监听，只有接收者会用到
    channel.onmessage = (event) => {
      // 元数据握手层
      if (typeof event.data === 'string') {
        try {
          const meta = JSON.parse(event.data);
          if (meta.type === 'metadata') {
            // 启动接收引擎
            const id = Math.random().toString(36).substring(2, 9);
            activeReceiver = new FileReceiverEngine(id, meta.filename, meta.totalBytes);

            transferTasks.value.unshift({
              id,
              filename: activeReceiver.filename,
              totalBytes: activeReceiver.totalBytes,
              transferredBytes: 0,
              speed: '握手中...',
              estimatedTime: '初始化...',
              status: 'transferring',
              engine: activeReceiver
            });

            activeReceiver.on('progress', (progress) => {
              const existTask = transferTasks.value.find(t => t.id === progress.id);
              if (existTask) Object.assign(existTask, progress);
            });
          }
        } catch (e) {
          console.error('Metadata Parse Error', e);
        }
      }
      // 纯二进制接收层
      else if (event.data instanceof ArrayBuffer) {
        if (activeReceiver) {
          activeReceiver.updateProgress(event.data);
        }
      }
    };
  });

  webrtcManager.init();

  // 当对面（不管是接收人还是发送人）加入房间引爆 PEER 事件时
  signalingService.onPeerJoined((payload) => {
    if (currentRole.value === 'sender') {
      // 如果我们是发件人，且收到了收件人的加入通知，则由我们弹射发起 WEBRTC Call
      webrtcManager!.call();
    }
  });

  signalingService.onPeerLeft(() => {
    connectionStatus.value = 'disconnected';
  });
};

const onConnect = async (code: string) => {
  if (!code || code === deviceCode.value) return;

  try {
    // 离开自己作为 sender 的房间，去加别人的房间作为 receiver
    signalingService.leaveRoom(deviceCode.value);
    await signalingService.joinRoom(code, 'receiver');

    currentRole.value = 'receiver';
    connectionStatus.value = 'connecting';
    deviceCode.value = code; // 同步当前锁定的连接码

    initWebRTCManager('receiver');
  } catch (err: any) {
    alert(`连接失败: ${err.message}`);
    // 连接失败复原回原本页面状态 （需重新刷新逻辑这先从简略过）
  }
};


// ========== 文件传输队列引擎管理 ==========
interface TransferTaskModel extends TransferProgress {
  filename: string;
  engine: __BaseEngine;
}

const transferTasks = ref<TransferTaskModel[]>([]);
const activeCount = computed(() => transferTasks.value.filter(t => t.status === 'transferring').length);

const onFilesSelected = (files: FileList | File[]) => {
  if (currentRole.value !== 'sender' || !webrtcManager) return;
  const channel = webrtcManager.getChannel();
  if (!channel || channel.readyState !== 'open') {
    alert('数据通道未建立，请等待对方连接完毕再投递。');
    return;
  }

  Array.from(files).forEach(file => {
    const id = Math.random().toString(36).substring(2, 9);
    const engine = new TransferEngine(file, id);

    transferTasks.value.unshift({
      id,
      filename: file.name,
      totalBytes: file.size,
      transferredBytes: 0,
      speed: '准备中...',
      estimatedTime: '计算中...',
      status: 'transferring',
      engine
    });

    engine.on('progress', (progress) => {
      const existTask = transferTasks.value.find(t => t.id === progress.id);
      if (existTask) Object.assign(existTask, progress);
    });

    // 开始以通道推送数据
    engine.startWithChannel(channel);
  });
};

// ========== 传输列表动作拦截回调 ==========
const onViewAll = () => {
  console.log('[Mock Action] 触发“查看全部”跳转');
};

const handlePause = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task && task.engine instanceof TransferEngine) task.engine.pause();
};

const handleResume = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task && task.engine instanceof TransferEngine) task.engine.resume();
};

const handleCancel = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task) task.engine.cancel();
  transferTasks.value = transferTasks.value.filter(t => t.id !== id);
};

onUnmounted(() => {
  transferTasks.value.forEach(task => task.engine.cancel());
  if (webrtcManager) webrtcManager.close();
  if (signalingService.roomId) {
    signalingService.leaveRoom(signalingService.roomId);
  }
  signalingService.offAuthVerified(handleAuthVerified);
  // 不在此调用 disconnect()，保留该单态在其他界面的共享在线状态
});
</script>

<style scoped>
/* ====== 雷达脉冲环 ====== */
.radar-wrapper {
  width: 180px;
  height: 180px;
}

.pulse-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(59, 130, 246, 0.35);
  /* 改用 ease-in-out，首尾均为 opacity:0，消除循环闪跳 */
  animation: radar-pulse 3s ease-in-out infinite;
  pointer-events: none;
  /* 初始状态与关键帧 0% 保持一致，避免首帧闪烁 */
  opacity: 0;
}

.ring-1 {
  width: 100px;
  height: 100px;
  animation-delay: 0s;
}

.ring-2 {
  width: 140px;
  height: 140px;
  animation-delay: 0.8s;
}

.ring-3 {
  width: 180px;
  height: 180px;
  animation-delay: 1.6s;
}

/* 首尾 opacity 均为 0，循环衔接完全丝滑 */
@keyframes radar-pulse {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }

  25% {
    opacity: 0.55;
  }

  100% {
    opacity: 0;
    transform: scale(1.06);
  }
}

/* Dark mode: 加深脉冲可见度 */
:root.dark .pulse-ring {
  border-color: rgba(59, 130, 246, 0.45);
}

/* ====== 核心图标微动效 ====== */
.core-icon {
  animation: core-breathe 3s ease-in-out infinite;
}

@keyframes core-breathe {

  0%,
  100% {
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.12), 0 6px 24px rgba(59, 130, 246, 0.14);
  }

  50% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22), 0 8px 40px rgba(59, 130, 246, 0.26);
  }
}

/* ====== SVG 弧线同步呼吸（:deep 穿透 SvgIcon 子组件，与脉冲环同周期 3s） ====== */
.core-icon :deep(svg) {
  animation: arc-breathe 3s ease-in-out infinite;
}

@keyframes arc-breathe {

  0%,
  100% {
    opacity: 0.85;
  }

  50% {
    opacity: 1;
  }
}

/* ====== 三步引导卡入场动画 ====== */
.step-card:nth-child(1) {
  animation: step-appear 0.5s ease-out 0.1s both;
}

.step-card:nth-child(2) {
  animation: step-appear 0.5s ease-out 0.2s both;
}

.step-card:nth-child(3) {
  animation: step-appear 0.5s ease-out 0.3s both;
}

@keyframes step-appear {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
