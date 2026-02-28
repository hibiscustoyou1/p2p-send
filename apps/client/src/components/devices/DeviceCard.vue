<template>
  <!-- 外层卡片控制动画与阴影反馈。如果是离线卡片，增加整体半透明且移除强高亮阴影效果 -->
  <div
    :class="[
      'group relative flex flex-col rounded-2xl bg-white dark:bg-surface-dark p-5 border transition-all hover:-translate-y-1',
      status === 'offline'
        ? 'opacity-80 border-slate-200 dark:border-slate-700 hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] shadow-sm'
        : 'border-slate-200 dark:border-slate-700 shadow-sm',
      status === 'active'
        ? 'hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]'
        : status === 'online'
          ? 'hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]'
          : ''
    ]">
    
    <!-- 卡片上部分栏：图标与运行状态胶囊 -->
    <div class="mb-4 flex items-start justify-between">
      <div
        :class="[
          'flex items-center justify-center h-12 w-12 rounded-xl text-[28px]',
          status === 'offline'
            ? 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 text-slate-400 dark:text-slate-500'
            : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-600 dark:text-slate-300'
        ]">
        <SvgIcon :name="iconName" />
      </div>

      <!-- 状态指示胶囊 -->
      <div
        v-if="status !== 'offline'"
        class="flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-600 dark:text-green-400 border border-green-100 dark:border-green-500/20">
        <div class="h-2 w-2 rounded-full bg-green-500"></div>
        <span>在线</span>
      </div>
      <div
        v-else
        class="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <div class="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"></div>
        <span>离线</span>
      </div>
    </div>

    <!-- 用户信息与标识区 -->
    <div class="mb-6 flex-1">
      <h3
        :class="[
          'text-lg font-bold',
          status === 'offline' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'
        ]"
      >{{ deviceName }}</h3>
      <p
        :class="[
          'mt-1 text-sm',
          status === 'offline' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'
        ]"
      >{{ subtext }}</p>
      <p
        :class="[
          'mt-4 text-xs font-medium',
          status === 'offline' ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
        ]"
      >ID: {{ displayId }}</p>
    </div>

    <!-- 底部操作底栏区 -->
    <div class="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
      <!-- 活跃发送按钮 -->
      <button
        v-if="status === 'active'"
        @click="$emit('send', id)"
        class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600">
        <SvgIcon name="send" class="text-[18px]" /> 发送
      </button>

      <!-- 普通联机发送按钮 -->
      <button
        v-if="status === 'online'"
        @click="$emit('send', id)"
        class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 dark:bg-primary/20 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 dark:hover:bg-primary/30">
        <SvgIcon name="send" class="text-[18px]" /> 发送
      </button>

      <!-- 离线态按钮占位 -->
      <button
        v-if="status === 'offline'"
        class="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm font-semibold text-slate-400 dark:text-slate-600"
        disabled>
        <SvgIcon name="cloud_off" class="text-[18px]" /> 离线
      </button>

      <!-- 公共编辑操作 -->
      <button
        @click="$emit('edit', id)"
        class="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition-colors"
        title="重命名">
        <SvgIcon name="edit" class="text-[20px]" />
      </button>
      
      <!-- 公共移除操作 -->
      <button
        @click="$emit('remove', id)"
        class="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
        title="移除">
        <SvgIcon name="delete" class="text-[20px]" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

interface Props {
  id: string;
  name: string;      // 设备的别名或原名
  rawId: string;     // 设备用于显示的短 ID (比如由 UUID 生成首部)
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  status: 'active' | 'online' | 'offline';
  subtext?: string;  // 灰字提醒
}

const props = withDefaults(defineProps<Props>(), {
  status: 'offline',
  subtext: ''
});

defineEmits<{
  (e: 'send', id: string): void;
  (e: 'edit', id: string): void;
  (e: 'remove', id: string): void;
}>();

// 根据机器性质返回设计里的 Svg 类型名称
const iconName = computed(() => {
  switch (props.deviceType) {
    case 'desktop': return 'laptop_mac';
    case 'mobile': return 'smartphone';
    case 'tablet': return 'tablet_mac';
    default: return 'devices'; // 万能插配
  }
});

// 计算对外的展示 ID 如果太长截断为 Mac 地址类似的展示格式
const displayId = computed(() => {
  const short = props.rawId.substring(0, 8).toUpperCase();
  // 假设格式为 AA:BB:CC:DD 以模拟源设计稿
  return short.match(/.{1,2}/g)?.join(':') || props.rawId;
});

const deviceName = computed(() => props.name);
</script>
