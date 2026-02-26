<template>
  <!-- 传输视图 -->
  <div class="relative z-10 p-8 max-w-6xl mx-auto w-full flex flex-col gap-8 fade-in">
    <!-- 连接码面板 -->
    <header
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel rounded-xl p-6">
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <span
            class="flex h-3 w-3 rounded-full bg-accent-success shadow-[0_0_12px_rgba(16,185,129,0.4)] dark:shadow-[0_0_12px_rgba(16,185,129,0.6)]"></span>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">您的设备已准备就绪</p>
        </div>
        <div class="flex items-end gap-3">
          <h2 class="text-slate-900 dark:text-slate-100 text-4xl font-bold tracking-tight">782 914</h2>
          <button class="text-primary hover:text-primary-dark mb-1 transition-colors outline-none" title="复制验证码">
            <span class="material-symbols-outlined text-xl">content_copy</span>
          </button>
        </div>
        <p class="text-slate-500 text-sm">分享此连接码以安全接收文件。</p>
      </div>

      <div
        class="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/50 w-full md:w-auto">
        <div class="flex gap-2">
          <input v-for="i in 6" :key="i"
            class="w-10 h-12 text-center bg-white dark:bg-slate-800 rounded-lg border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-lg focus:ring-primary focus:border-primary placeholder-slate-400 dark:placeholder-slate-600 transition-all shadow-sm outline-none"
            maxlength="1" placeholder="•" type="text" />
        </div>
        <button
          class="h-12 px-6 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2 outline-none">
          <span>连接</span>
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </header>

    <!-- 拖拽上传区 -->
    <section class="relative group">
      <div
        class="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-600/20 dark:from-primary/30 dark:to-purple-600/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500">
      </div>
      <div
        class="relative flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 transition-colors cursor-pointer w-full h-80">
        <div
          class="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
          <span class="material-symbols-outlined text-primary text-5xl">cloud_upload</span>
        </div>
        <h3 class="text-slate-900 dark:text-white text-2xl font-bold mb-2">拖拽文件至此</h3>
        <p class="text-slate-500 dark:text-slate-400 text-base mb-8 text-center max-w-md">或点击浏览本地存储。支持 ZIP、PKG、DMG
          及大型媒体文件。</p>
        <button
          class="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm outline-none">
          浏览文件
        </button>
      </div>
    </section>

    <!-- 活动传输列表 -->
    <section class="flex flex-col gap-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-slate-900 dark:text-white text-lg font-bold flex items-center gap-2">
          当前传输
          <span
            class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">2</span>
        </h3>
        <button class="text-primary hover:text-primary-dark text-sm font-medium outline-none">查看全部</button>
      </div>

      <!-- 传输卡片 1: 正在进行 -->
      <div
        class="glass-panel p-5 rounded-xl flex items-center gap-5 transition-transform hover:-translate-y-1 duration-200">
        <div
          class="h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-500 dark:text-blue-400">
          <span class="material-symbols-outlined">folder_zip</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center mb-1">
            <h4 class="text-slate-900 dark:text-white font-semibold truncate">项目资产压缩包.zip</h4>
            <span class="text-slate-500 dark:text-slate-400 text-xs font-mono">45 MB/s</span>
          </div>
          <div class="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>1.2 GB / 1.6 GB</span>
            <span>剩余 2 分钟</span>
          </div>
          <div class="relative h-2 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
            <div class="absolute top-0 left-0 h-full bg-primary w-[72%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
          </div>
        </div>
        <button
          class="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors outline-none">
          <span class="material-symbols-outlined">pause</span>
        </button>
        <button
          class="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-accent-error transition-colors outline-none">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- 传输卡片 2: 错误/中断 -->
      <div
        class="glass-panel p-5 rounded-xl flex items-center gap-5 border-l-4 border-l-accent-error transition-transform hover:-translate-y-1 duration-200 bg-red-50/50 dark:bg-red-900/5">
        <div
          class="h-12 w-12 rounded-lg bg-red-50 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500 dark:text-red-400">
          <span class="material-symbols-outlined">package_2</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center mb-1">
            <h4 class="text-slate-900 dark:text-white font-semibold truncate">设计系统最终版.pkg</h4>
            <span class="text-accent-error text-xs font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">wifi_off</span>
              连接断开
            </span>
          </div>
          <div class="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>560 MB / 1.0 GB</span>
            <span>已暂停</span>
          </div>
          <div class="relative h-2 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
            <div class="absolute top-0 left-0 h-full bg-accent-error w-[56%]"></div>
          </div>
        </div>
        <button
          class="h-9 px-4 flex items-center gap-2 justify-center rounded-lg bg-red-100 dark:bg-accent-error/20 text-accent-error border border-red-200 dark:border-accent-error/30 hover:bg-accent-error hover:text-white transition-all shadow-sm dark:shadow-[0_0_15px_rgba(239,68,68,0.3)] outline-none">
          <span class="material-symbols-outlined text-sm">refresh</span>
          <span class="text-sm font-bold">继续</span>
        </button>
        <button
          class="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors outline-none">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped></style>

<style scoped></style>
