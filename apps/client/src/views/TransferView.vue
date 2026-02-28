<template>
  <!-- 传输视图 -->
  <div class="relative z-10 p-8 max-w-6xl mx-auto w-full flex flex-col gap-8 fade-in">
    <!-- 连接面板子组件 -->
    <ConnectionPanel :deviceCode="deviceCode" @connect="onConnect" />

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
import { TransferEngine, FileReceiverEngine, type TransferProgress, type __BaseEngine } from '@/services/fileTransfer';
import { signalingService, getMyDeviceId } from '@/services/socket';
import { WebRTCManager } from '@/services/webrtc';
import { deviceManager } from '@/services/deviceManager';

// ========== 连接区域状态 ==========
const deviceCode = ref('获 取 中 ...');
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
const currentRole = ref<'sender' | 'receiver'>('sender');

let webrtcManager: WebRTCManager | null = null;
let activeReceiver: FileReceiverEngine | null = null;

onMounted(async () => {
  // 阶段四：清空原先纯前端的自增房管，完全听令于大厅发号系统
  try {
    // 优雅接听，直接用 services/socket.ts 暴露的方法去注册
    signalingService.onAuthVerified((payload) => {
      deviceCode.value = payload.staticId;
      currentRole.value = 'sender'; // 我们目前在自己界面就是待机发送者
      signalingService.joinRoom(payload.staticId.replace(/\s+/g, ''), 'sender').catch(err => console.error(err));
      initWebRTCManager('sender');
    });

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
      if (signalingService.peerId) {
        deviceManager.upsertDevice({
          id: signalingService.peerId,
          originalName: `Device ${signalingService.peerId.substring(0, 4)}`,
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
  signalingService.disconnect();
});
</script>

<style scoped></style>
