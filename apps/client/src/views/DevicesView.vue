<template>
  <div class="relative flex flex-col min-h-full w-full overflow-y-auto">
    <!-- 设备视图 -->
    <div class="relative z-10 p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6 md:gap-8 h-full">
      <!-- 头部 -->
      <div class="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex flex-col gap-2">
          <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">受信任设备</h2>
          <p class="text-slate-500 dark:text-slate-400">安全地管理您的点对点连接。</p>
        </div>
        <button
          class="flex items-center gap-2 self-start sm:self-auto rounded-xl bg-white dark:bg-surface-dark px-4 py-2.5 text-sm font-bold text-primary shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95">
          <SvgIcon name="qr_code_scanner" class="text-[20px]" />
          <span class="hidden sm:inline">添加设备</span>
        </button>
      </div>

      <!-- 雷达扫描区 -->
      <div
        class="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-6 sm:p-8 md:p-10 shadow-sm border border-slate-200 dark:border-slate-700">
        <!-- 响应式雷达背景圆圈：使用 min() 防止超出容器宽度 -->
        <div class="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div class="rounded-full border border-primary/10" style="width: min(600px, 90vw); height: min(600px, 90vw);">
          </div>
          <div class="absolute rounded-full border border-primary/20"
            style="width: min(450px, 72vw); height: min(450px, 72vw);"></div>
          <div class="absolute rounded-full border border-primary/30"
            style="width: min(300px, 54vw); height: min(300px, 54vw);"></div>
          <div class="absolute rounded-full border border-primary/40 bg-primary/5"
            style="width: min(150px, 36vw); height: min(150px, 36vw);"></div>
        </div>
        <div class="relative z-10 flex flex-col items-center gap-4 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SvgIcon name="radar" class="text-[32px] animate-pulse" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">正在扫描附近节点...</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">请确保设备处于同一网络</p>
          </div>
          <button class="mt-2 text-sm font-semibold text-primary hover:underline">手动连接</button>
        </div>
      </div>

      <!-- 设备网格 -->
      <div class="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <template v-if="trustedDevices.length > 0">
          <DeviceCard v-for="device in trustedDevices" :key="device.id" :id="device.id"
            :name="device.alias || device.originalName" :rawId="device.id" :deviceType="device.deviceType"
            :status="onlineDeviceIds.has(device.id) ? 'online' : 'offline'"
            :subtext="'上次活跃: ' + formatTimeAgo(device.lastSeen)" @send="handleSend" @edit="handleEdit"
            @remove="handleRemove" />
        </template>
        <!-- 没设备时的兜底槽位 -->
        <div v-else
          class="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center p-10 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <SvgIcon name="phonelink_erase" class="text-4xl mb-3 text-slate-300 dark:text-slate-600" />
          <p class="text-sm">暂无信任连接</p>
          <p class="text-xs mt-1 text-slate-400">目前没有过互相授权的历史设备</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 编辑备注名 Modal -->
  <DeviceEditModal :isVisible="editModal.visible" :deviceName="editModal.currentName" @confirm="onEditConfirm"
    @cancel="editModal.visible = false" />

  <!-- 移除确认 Modal -->
  <DeviceConfirmModal :isVisible="confirmModal.visible" message="确定要移除这台受信任设备吗？移除后将无法免输码一键互传。"
    @confirm="onRemoveConfirm" @cancel="confirmModal.visible = false" />
</template>

<script setup lang="ts">
import { ref, reactive, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import SvgIcon from '@/components/common/SvgIcon.vue';
import DeviceCard from '@/components/devices/DeviceCard.vue';
import DeviceEditModal from '@/components/devices/DeviceEditModal.vue';
import DeviceConfirmModal from '@/components/devices/DeviceConfirmModal.vue';
import { deviceManager, type TrustedDevice } from '@/services/deviceManager';
import { signalingService } from '@/services/socket';

const router = useRouter();
const trustedDevices = ref<TrustedDevice[]>([]);
const onlineDeviceIds = ref<Set<string>>(new Set());

// ========== 自定义 Modal 状态 ==========
const editModal = reactive({
  visible: false,
  targetId: '',
  currentName: '',
});

const confirmModal = reactive({
  visible: false,
  targetId: '',
});

const loadDevices = () => {
  trustedDevices.value = deviceManager.getAllDevices();

  // 向 Socket 后端触发订阅式询问
  if (trustedDevices.value.length > 0) {
    const targetIds = trustedDevices.value.map(d => d.id);
    signalingService.checkDeviceOnlineStatus(targetIds);
  }
};

// 使用 onActivated 代替 onMounted，使 keep-alive 缓存恢复时也能重新查询在线状态
onActivated(async () => {
  // 每次激活时先清空上一次的在线状态缓存，避免脏数据残留
  onlineDeviceIds.value = new Set();
  loadDevices();

  // 若信令还未连接，在这里补联（针对用户直接跳页面的情况）
  try {
    await signalingService.connect();
    // 每次激活都需要重新注册，因为 onDeactivated 时会清除监听器
    signalingService.onDeviceStatusChanged((payload) => {
      if (payload.status === 'online') {
        onlineDeviceIds.value.add(payload.deviceId);
      } else {
        onlineDeviceIds.value.delete(payload.deviceId);
      }
    });
  } catch (e) {
    console.warn('Socket 离线加载受限:', e);
  }
});

// 使用 onDeactivated 代替 onUnmounted，页面切走时解绑监听器
onDeactivated(() => {
  signalingService.clearListeners();
});

const formatTimeAgo = (timestamp: number) => {
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  return `${Math.floor(diffHours / 24)} 天前`;
};

const handleSend = (id: string) => {
  router.push({ path: '/transfer', query: { connectTo: id } });
};

// 打开编辑 Modal（替换 window.prompt）
const handleEdit = (id: string) => {
  const device = trustedDevices.value.find(d => d.id === id);
  if (!device) return;
  editModal.targetId = id;
  editModal.currentName = device.alias || device.originalName;
  editModal.visible = true;
};

// 编辑 Modal 确认回调
const onEditConfirm = (newName: string) => {
  deviceManager.updateDeviceAlias(editModal.targetId, newName);
  editModal.visible = false;
  loadDevices();
};

// 打开移除确认 Modal（替换 window.confirm）
const handleRemove = (id: string) => {
  confirmModal.targetId = id;
  confirmModal.visible = true;
};

// 移除确认回调
const onRemoveConfirm = () => {
  deviceManager.removeDevice(confirmModal.targetId);
  confirmModal.visible = false;
  loadDevices();
};
</script>

<style scoped>
/* 雷达波纹由 Tailwind 预置原子实现，本页可在此增加转场自定义动画 */
</style>
