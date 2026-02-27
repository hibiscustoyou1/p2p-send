<template>
  <div class="relative flex flex-col h-full w-full">
    <!-- 全局氛围光效背景 (仅作视觉点缀) -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        class="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] dark:blur-[120px] transition-all duration-700">
      </div>
      <div
        class="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[100px] transition-all duration-700">
      </div>
    </div>

    <!-- 历史记录视图 -->
    <div class="relative z-10 p-8 w-full max-w-6xl mx-auto flex flex-col gap-6 fade-in h-full">
      <header class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex flex-col">
          <h2 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">传输历史</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">管理和追踪您的文件活动</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="relative group">
            <SvgIcon name="search"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl" />
            <input
              class="pl-10 pr-4 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64 lg:w-80 placeholder:text-slate-400 text-slate-700 dark:text-slate-200 shadow-sm"
              placeholder="搜索文件或设备..." type="text" />
          </div>
        </div>
      </header>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          class="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-soft flex flex-col items-start gap-4">
          <div class="flex items-center justify-between w-full">
            <div
              class="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center text-primary">
              <SvgIcon name="cloud_upload" class="text-xl" />
            </div>
            <span
              class="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">本月</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatSize(totalSentBytes) }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">总发送量</p>
          </div>
        </div>
        <div
          class="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-soft flex flex-col items-start gap-4">
          <div class="flex items-center justify-between w-full">
            <div
              class="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <SvgIcon name="cloud_download" class="text-xl" />
            </div>
            <span
              class="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">本月</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatSize(totalReceivedBytes) }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">总接收量</p>
          </div>
        </div>
        <div
          class="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-soft flex flex-col items-start gap-4">
          <div class="flex items-center justify-between w-full">
            <div
              class="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <SvgIcon name="speed" class="text-xl" />
            </div>
            <span
              class="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">平均</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ avgSpeed }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">传输速度</p>
          </div>
        </div>
      </div>

      <!-- 列表控制栏 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          class="flex items-center gap-2 bg-white dark:bg-surface-dark p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
          <button @click="currentFilter = 'all'" :class="[
            'px-4 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
            currentFilter === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
          ]">全部</button>
          <button @click="currentFilter = 'send'" :class="[
            'px-4 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
            currentFilter === 'send' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
          ]">已发送</button>
          <button @click="currentFilter = 'receive'" :class="[
            'px-4 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
            currentFilter === 'receive' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
          ]">已接收</button>
          <button @click="currentFilter = 'failed'" :class="[
            'px-4 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
            currentFilter === 'failed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
          ]">已失败</button>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors">
            <SvgIcon name="filter_list" class="text-[18px]" />
            筛选
          </button>
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors">
            <SvgIcon name="download" class="text-[18px]" />
            导出
          </button>
        </div>
      </div>

      <!-- 数据表格 -->
      <div
        class="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1">
        <div class="overflow-x-auto history-table-container">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <th
                  class="py-4 pl-6 pr-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[35%]">
                  文件名</th>
                <th
                  class="py-4 px-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[15%]">
                  大小</th>
                <th
                  class="py-4 px-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[20%]">
                  详情</th>
                <th
                  class="py-4 px-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[15%]">
                  日期</th>
                <th
                  class="py-4 pl-4 pr-6 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[15%] text-right">
                  状态</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="record in paginatedRecords" :key="record.id"
                class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 pl-6 pr-4">
                  <div class="flex items-center gap-4">
                    <div
                      :class="`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${getIconForFile(record.filename).bg} ${getIconForFile(record.filename).color}`">
                      <SvgIcon :name="getIconForFile(record.filename).name" class="text-xl" />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer truncate max-w-[200px]"
                        :title="record.filename">
                        {{ record.filename }}</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400 uppercase">{{
                        record.filename.split('.').pop() || 'FILE' }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ formatSize(record.size)
                  }}</span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <SvgIcon :name="record.type === 'send' ? 'arrow_forward' : 'arrow_back'"
                        class="text-[14px] text-slate-400" />
                      {{ record.type === 'send' ? '发送至' : '来自' }}: {{ record.peerName }}
                    </div>
                    <span class="text-[10px] text-slate-400 mt-0.5" :title="record.id">ID: #{{
                      record.id.split('-')[0]?.toUpperCase() }}</span>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ formatDate(record.timestamp)
                    }}</span>
                    <span class="text-xs text-slate-400">{{ formatTime(record.timestamp) }}</span>
                  </div>
                </td>
                <td class="py-4 pl-4 pr-6 text-right">
                  <span v-if="record.status === 'success'"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    已完成
                  </span>
                  <span v-else-if="record.status === 'failed'"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                    已失败
                  </span>
                  <span v-else-if="record.status === 'cancelled'"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20">
                    已取消
                  </span>
                </td>
              </tr>
              <!-- default empty fallback -->
              <tr v-if="filteredRecords.length === 0">
                <td colspan="5" class="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">暂无匹配的传输历史记录</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div
          class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <span class="text-sm text-slate-500 dark:text-slate-400">
            显示第 {{ filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }}-{{ Math.min(currentPage *
              itemsPerPage, filteredRecords.length) }} 项，共 {{ filteredRecords.length }} 项
          </span>
          <div class="flex items-center gap-2">
            <button @click="currentPage > 1 && currentPage--" :disabled="currentPage <= 1"
              class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              <SvgIcon name="chevron_left" class="text-[18px]" />
            </button>
            <button v-for="page in totalPages" :key="page" @click="currentPage = page" :class="[
              'h-8 w-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
              currentPage === page
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            ]">
              {{ page }}
            </button>
            <button @click="currentPage < totalPages && currentPage++" :disabled="currentPage >= totalPages"
              class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              <SvgIcon name="chevron_right" class="text-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { historyService, type TransferRecord } from '@/services/db';

const records = ref<TransferRecord[]>([]);
const currentFilter = ref<'all' | 'send' | 'receive' | 'failed'>('all');

// Pagination state
const currentPage = ref(1);
const itemsPerPage = 8;

onMounted(async () => {
  records.value = await historyService.getAllRecords();
});

// 计算统计值
const totalSentBytes = computed(() => {
  return records.value
    .filter(r => r.type === 'send' && r.status === 'success')
    .reduce((sum, r) => sum + r.size, 0);
});

const totalReceivedBytes = computed(() => {
  return records.value
    .filter(r => r.type === 'receive' && r.status === 'success')
    .reduce((sum, r) => sum + r.size, 0);
});

const avgSpeed = computed(() => {
  return records.value.length > 0 ? '极速' : '---';
});

// 计算过滤后数据
const filteredRecords = computed(() => {
  let list = records.value;
  if (currentFilter.value === 'send') list = list.filter(r => r.type === 'send');
  else if (currentFilter.value === 'receive') list = list.filter(r => r.type === 'receive');
  else if (currentFilter.value === 'failed') list = list.filter(r => r.status === 'failed' || r.status === 'cancelled');
  return list;
});

// 当过滤器改变，重置页数
watch(currentFilter, () => {
  currentPage.value = 1;
});

// 分页数据截取
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / itemsPerPage)));
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredRecords.value.slice(start, start + itemsPerPage);
});

// 辅助方法
const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();

  const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  if (isToday) return '今天';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return '昨天';

  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toTimeString().substring(0, 5);
};

const getIconForFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return { name: 'picture_as_pdf', bg: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-500' };
    case 'mp4': case 'mov': case 'avi': return { name: 'video_file', bg: 'bg-purple-50 dark:bg-purple-500/10', color: 'text-purple-500' };
    case 'zip': case 'rar': case '7z': return { name: 'folder_zip', bg: 'bg-orange-50 dark:bg-orange-500/10', color: 'text-orange-500' };
    case 'jpg': case 'jpeg': case 'png': case 'gif': return { name: 'image', bg: 'bg-blue-50 dark:bg-blue-500/10', color: 'text-primary' };
    default: return { name: 'insert_drive_file', bg: 'bg-slate-50 dark:bg-slate-500/10', color: 'text-slate-500' };
  }
};
</script>

<style scoped>
/* Custom scrollbar for inner container */
.history-table-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.history-table-container::-webkit-scrollbar-track {
  background: transparent;
}

.history-table-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

:global(.dark) .history-table-container::-webkit-scrollbar-thumb {
  background: #334155;
}

.history-table-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

:global(.dark) .history-table-container::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* View transition animation */
.fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
