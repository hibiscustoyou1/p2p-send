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
            <p class="text-2xl font-bold text-slate-900 dark:text-white">45.2 GB</p>
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
            <p class="text-2xl font-bold text-slate-900 dark:text-white">128.5 GB</p>
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
            <p class="text-2xl font-bold text-slate-900 dark:text-white">24 MB/s</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">传输速度</p>
          </div>
        </div>
      </div>

      <!-- 列表控制栏 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          class="flex items-center gap-2 bg-white dark:bg-surface-dark p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
          <button
            class="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold shadow-sm whitespace-nowrap">全部</button>
          <button
            class="px-4 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-medium transition-colors whitespace-nowrap">已发送</button>
          <button
            class="px-4 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-medium transition-colors whitespace-nowrap">已接收</button>
          <button
            class="px-4 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm font-medium transition-colors whitespace-nowrap">已失败</button>
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

              <!-- 项 1 -->
              <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 pl-6 pr-4">
                  <div class="flex items-center gap-4">
                    <div
                      class="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                      <SvgIcon name="picture_as_pdf" class="text-xl" />
                    </div>
                    <div>
                      <p
                        class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer">
                        第三季度财务报告.pdf</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">文档</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="text-sm font-medium text-slate-600 dark:text-slate-300">45 MB</span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <SvgIcon name="arrow_forward" class="text-[14px] text-slate-400" />
                      发送至: MacBook-Pro
                    </div>
                    <span class="text-[10px] text-slate-400 mt-0.5">ID: #TR-88392</span>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">今天</span>
                    <span class="text-xs text-slate-400">14:30</span>
                  </div>
                </td>
                <td class="py-4 pl-4 pr-6 text-right">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    已完成
                  </span>
                </td>
              </tr>

              <!-- 项 2 -->
              <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 pl-6 pr-4">
                  <div class="flex items-center gap-4">
                    <div
                      class="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <SvgIcon name="video_file" class="text-xl" />
                    </div>
                    <div>
                      <p
                        class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer">
                        假期视频.mp4</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">视频</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="text-sm font-medium text-slate-600 dark:text-slate-300">1.2 GB</span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <SvgIcon name="arrow_back" class="text-[14px] text-slate-400" />
                      来自: iPhone-13
                    </div>
                    <span class="text-[10px] text-slate-400 mt-0.5">ID: #TR-88341</span>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">昨天</span>
                    <span class="text-xs text-slate-400">18:20</span>
                  </div>
                </td>
                <td class="py-4 pl-4 pr-6 text-right">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    已完成
                  </span>
                </td>
              </tr>

              <!-- 项 3 -->
              <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 pl-6 pr-4">
                  <div class="flex items-center gap-4">
                    <div
                      class="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <SvgIcon name="folder_zip" class="text-xl" />
                    </div>
                    <div>
                      <p
                        class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer">
                        项目备份.zip</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">压缩包</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="text-sm font-medium text-slate-600 dark:text-slate-300">850 MB</span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <SvgIcon name="arrow_forward" class="text-[14px] text-slate-400" />
                      发送至: Office-Desktop
                    </div>
                    <span class="text-[10px] text-slate-400 mt-0.5">ID: #TR-87102</span>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">10月24日</span>
                    <span class="text-xs text-slate-400">09:15</span>
                  </div>
                </td>
                <td class="py-4 pl-4 pr-6 text-right">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                    已失败
                  </span>
                </td>
              </tr>

              <!-- 项 4 -->
              <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 pl-6 pr-4">
                  <div class="flex items-center gap-4">
                    <div
                      class="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-primary flex items-center justify-center shrink-0">
                      <SvgIcon name="image" class="text-xl" />
                    </div>
                    <div>
                      <p
                        class="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer">
                        个人头像.png</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">图片</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span class="text-sm font-medium text-slate-600 dark:text-slate-300">2 MB</span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <SvgIcon name="arrow_back" class="text-[14px] text-slate-400" />
                      来自: Sarah-Tablet
                    </div>
                    <span class="text-[10px] text-slate-400 mt-0.5">ID: #TR-86553</span>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">10月23日</span>
                    <span class="text-xs text-slate-400">11:45</span>
                  </div>
                </td>
                <td class="py-4 pl-4 pr-6 text-right">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20">
                    已取消
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div
          class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <span class="text-sm text-slate-500 dark:text-slate-400">显示第 1-4 项，共 24 项</span>
          <div class="flex items-center gap-2">
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              disabled>
              <SvgIcon name="chevron_left" class="text-[18px]" />
            </button>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white text-sm font-medium shadow-md shadow-primary/30">1</button>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors">2</button>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors">3</button>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <SvgIcon name="chevron_right" class="text-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';
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
