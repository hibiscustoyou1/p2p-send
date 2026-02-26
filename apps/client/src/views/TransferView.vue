<template>
  <!-- 传输视图 -->
  <div class="relative z-10 p-8 max-w-6xl mx-auto w-full flex flex-col gap-8 fade-in">
    <!-- 连接面板子组件 -->
    <ConnectionPanel :deviceCode="deviceCode" @connect="onConnect" />

    <!-- 拖拽上传子组件 -->
    <UploadZone @files-selected="onFilesSelected" />

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
import { ref, computed } from 'vue';
import ConnectionPanel from '@/components/transfer/ConnectionPanel.vue';
import UploadZone from '@/components/transfer/UploadZone.vue';
import TransferList from '@/components/transfer/TransferList.vue';
import TransferCard from '@/components/transfer/TransferCard.vue';

// ========== 连接区域状态 Mock ==========
const deviceCode = ref('782 914');

const onConnect = (code: string) => {
  // 模拟处理连接动作
  console.log('[Mock Action] 连接对端设备:', code);
  alert(`尝试连接代码: ${code}`);
};

// ========== 文件选择处理 ==========
const onFilesSelected = (files: FileList | File[]) => {
  console.log('[Mock Action] 检测到文件选取/拖入:', files);
  // 模拟添加新任务
  Array.from(files).forEach(file => {
    transferTasks.value.unshift({
      id: Math.random().toString(36).substring(2, 9),
      filename: file.name,
      totalBytes: file.size,
      transferredBytes: file.size * 0.1, // 模拟自带 10% 的进度
      speed: '加载中...',
      estimatedTime: '计算中...',
      status: 'transferring'
    });
  });
};

// ========== 传输列表状态 Mock ==========
type TaskStatus = 'transferring' | 'paused' | 'error' | 'completed';

interface TransferTask {
  id: string;
  filename: string;
  totalBytes: number;
  transferredBytes: number;
  speed: string;
  estimatedTime: string;
  status: TaskStatus;
}

// 设定两个 Mock 数据来维持原始设计稿的红蓝结构UI
const transferTasks = ref<TransferTask[]>([
  {
    id: 'sys_1',
    filename: '项目资产压缩包.zip',
    totalBytes: 1600000000,
    transferredBytes: 1152000000, // 大概是 72%
    speed: '45 MB/s',
    estimatedTime: '2 分钟',
    status: 'transferring'
  },
  {
    id: 'sys_2',
    filename: '设计系统最终版.pkg',
    totalBytes: 1000000000,
    transferredBytes: 560000000,  // 大概是 56% 
    speed: '0 MB/s',
    estimatedTime: '未知',
    status: 'error'
  }
]);

// 计算正在活动的任务数量
const activeCount = computed(() => transferTasks.value.filter(t => t.status === 'transferring').length);

// 各种回调 Mock
const onViewAll = () => {
  console.log('[Mock Action] 触发“查看全部”跳转');
};

const handlePause = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task) task.status = 'paused';
};

const handleResume = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task) task.status = 'transferring';
};

const handleCancel = (id: string) => {
  // 真正的取消或删除（直接在列表抹去）
  transferTasks.value = transferTasks.value.filter(t => t.id !== id);
};
</script>

<style scoped></style>
