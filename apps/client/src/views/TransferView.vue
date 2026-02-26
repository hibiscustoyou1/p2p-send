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
import { ref, computed, onUnmounted } from 'vue';
import ConnectionPanel from '@/components/transfer/ConnectionPanel.vue';
import UploadZone from '@/components/transfer/UploadZone.vue';
import TransferList from '@/components/transfer/TransferList.vue';
import TransferCard from '@/components/transfer/TransferCard.vue';
import { TransferEngine, type TransferProgress } from '@/services/fileTransfer';

// ========== 连接区域状态 Mock ==========
const deviceCode = ref('782 914');

const onConnect = (code: string) => {
  // 模拟处理连接动作
  console.log('[Mock Action] 连接对端设备:', code);
  alert(`尝试连接代码: ${code}`);
};

// ========== 文件传输队列引擎管理 ==========
interface TransferTaskModel extends TransferProgress {
  filename: string;
  engine: TransferEngine;
}

const transferTasks = ref<TransferTaskModel[]>([]);

// 计算正在活动的任务数量
const activeCount = computed(() => transferTasks.value.filter(t => t.status === 'transferring').length);

const onFilesSelected = (files: FileList | File[]) => {
  Array.from(files).forEach(file => {
    const id = Math.random().toString(36).substring(2, 9);

    // 创建独立切片引擎实体
    const engine = new TransferEngine(file, id);

    // 推入初始状态
    transferTasks.value.unshift({
      id,
      filename: file.name,
      totalBytes: file.size,
      transferredBytes: 0,
      speed: '测速中...',
      estimatedTime: '计算中...',
      status: 'transferring',
      engine
    });

    // 侦听其实时触发推流，原地通过代理修改 UI 状态
    engine.on('progress', (progress) => {
      const existTask = transferTasks.value.find(t => t.id === progress.id);
      if (existTask) {
        existTask.transferredBytes = progress.transferredBytes;
        existTask.speed = progress.speed;
        existTask.estimatedTime = progress.estimatedTime;
        existTask.status = progress.status;
      }
    });

    // 挂载发动引擎
    engine.start();
  });
};

// ========== 传输列表动作拦截回调 ==========
const onViewAll = () => {
  console.log('[Mock Action] 触发“查看全部”跳转');
};

const handlePause = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task) task.engine.pause();
};

const handleResume = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task) task.engine.resume();
};

const handleCancel = (id: string) => {
  const task = transferTasks.value.find(t => t.id === id);
  if (task) task.engine.cancel();
  // 真正的取消或删除（直接在列表抹去）
  transferTasks.value = transferTasks.value.filter(t => t.id !== id);
};

// 安全卸载：组件销毁时停止背后所有的定时器引擎
onUnmounted(() => {
  transferTasks.value.forEach(task => task.engine.cancel());
});
</script>

<style scoped></style>
