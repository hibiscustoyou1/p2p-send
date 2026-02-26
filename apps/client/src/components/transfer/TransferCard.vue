<template>
  <div class="glass-panel p-5 rounded-xl flex items-center gap-5 transition-transform hover:-translate-y-1 duration-200"
    :class="status === 'error' ? 'border-l-4 border-l-accent-error bg-red-50/50 dark:bg-red-900/5' : ''">

    <!-- Icon 部分 -->
    <div class="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
      :class="status === 'error' ? 'bg-red-50 dark:bg-red-500/20 text-red-500 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400'">
      <SvgIcon :name="getIcon(filename)" class="text-2xl" />
    </div>

    <!-- 内容部分 -->
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-center mb-1">
        <h4 class="text-slate-900 dark:text-white font-semibold truncate">{{ filename }}</h4>
        <span v-if="status === 'transferring'" class="text-slate-500 dark:text-slate-400 text-xs font-mono">{{ speed
        }}</span>
        <span v-else-if="status === 'error'" class="text-accent-error text-xs font-bold flex items-center gap-1">
          <SvgIcon name="wifi_off" class="text-[14px]" />
          连接断开
        </span>
      </div>
      <div class="flex justify-between items-center text-xs text-slate-500 mb-2">
        <span>{{ formatBytes(transferredBytes) }} / {{ formatBytes(totalBytes) }}</span>
        <span v-if="status === 'transferring'">剩余 {{ estimatedTime }}</span>
        <span v-else-if="status === 'paused' || status === 'error'">已暂停</span>
      </div>
      <div class="relative h-2 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
        <div class="absolute top-0 left-0 h-full transition-all duration-300"
          :class="status === 'error' ? 'bg-accent-error' : 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]'"
          :style="{ width: progressPercentage + '%' }"></div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center justify-end w-[130px] gap-3 flex-shrink-0">
      <template v-if="status === 'transferring'">
        <button @click="$emit('pause')"
          class="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors outline-none">
          <SvgIcon name="pause" class="text-xl" />
        </button>
        <button @click="$emit('cancel')"
          class="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-accent-error transition-colors outline-none">
          <SvgIcon name="close" class="text-xl" />
        </button>
      </template>
      <template v-else-if="status === 'error' || status === 'paused'">
        <button @click="$emit('resume')"
          class="h-9 px-4 flex flex-shrink-0 items-center gap-2 justify-center rounded-lg border transition-all shadow-sm outline-none"
          :class="status === 'error' ? 'bg-red-100 dark:bg-accent-error/20 text-accent-error border-red-200 dark:border-accent-error/30 hover:bg-accent-error hover:text-white dark:shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white'">
          <SvgIcon name="refresh" class="text-sm" />
          <span class="text-sm font-bold">继续</span>
        </button>
        <button @click="$emit('cancel')"
          class="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors outline-none">
          <SvgIcon name="delete" class="text-xl" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

const props = defineProps<{
  id: string;
  filename: string;
  totalBytes: number;
  transferredBytes: number;
  speed: string; // e.g. "45 MB/s"
  estimatedTime: string; // e.g. "2 分钟"
  status: 'transferring' | 'paused' | 'error' | 'completed';
}>();

defineEmits(['pause', 'resume', 'cancel']);

const progressPercentage = computed(() => {
  if (props.totalBytes === 0) return 0;
  return Math.min(100, Math.round((props.transferredBytes / props.totalBytes) * 100));
});

// 辅助方法：猜测图标
const getIcon = (name: string) => {
  if (name.endsWith('.zip') || name.endsWith('.rar')) return 'folder_zip';
  if (name.endsWith('.pkg') || name.endsWith('.dmg')) return 'package_2';
  if (name.match(/\.(mp4|avi|mov)$/i)) return 'video_file';
  if (name.match(/\.(jpg|png|gif|webp)$/i)) return 'image';
  return 'insert_drive_file';
};

// 辅助方法：格式化包大小
const formatBytes = (bytes: number, decimals = 1) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
</script>
