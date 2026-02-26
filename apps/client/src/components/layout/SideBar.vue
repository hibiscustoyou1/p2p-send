<template>
  <aside
    class="w-64 flex-shrink-0 flex flex-col justify-between bg-white dark:bg-surface-darker border-r border-slate-200 dark:border-slate-800 z-20 transition-colors duration-300">
    <div class="flex flex-col gap-6 p-6">
      <!-- Logo -->
      <router-link to="/" class="flex flex-col cursor-pointer hover:opacity-80 transition-opacity outline-none">
        <div class="flex items-center gap-2 mb-1">
          <SvgIcon name="share_reviews" class="text-primary text-3xl" />
          <h1 class="text-slate-900 dark:text-white text-xl font-bold tracking-tight">P2P 共享</h1>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-xs font-medium pl-1">安全控制台</p>
      </router-link>

      <!-- 主导航 -->
      <nav class="flex flex-col gap-2 mt-4">
        <router-link to="/"
          class="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group outline-none"
          exact-active-class="active-nav text-primary rounded-r-xl"
          :class="[$route.path === '/' ? '' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl']">
          <SvgIcon name="swap_horiz" :class="$route.path === '/' ? 'fill-current' : ''" />
          <span class="text-sm font-semibold">传输</span>
        </router-link>

        <router-link to="/history"
          class="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group outline-none"
          active-class="active-nav text-primary rounded-r-xl"
          :class="[$route.path.startsWith('/history') ? '' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl']">
          <SvgIcon name="history" :class="$route.path.startsWith('/history') ? 'fill-current' : ''" />
          <span class="text-sm font-semibold">历史记录</span>
        </router-link>

        <router-link to="/devices"
          class="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group outline-none"
          active-class="active-nav text-primary rounded-r-xl"
          :class="[$route.path.startsWith('/devices') ? '' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl']">
          <SvgIcon name="devices" :class="$route.path.startsWith('/devices') ? 'fill-current' : ''" />
          <span class="text-sm font-semibold">设备</span>
        </router-link>
      </nav>
    </div>

    <!-- 底部操作与用户区 -->
    <div class="p-6 flex flex-col gap-2">
      <button
        class="flex w-full items-center justify-center gap-2 rounded-xl h-10 bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-all text-sm font-bold border border-primary/20 outline-none">
        <SvgIcon name="add_link" class="text-sm" />
        <span>快速链接</span>
      </button>

      <div class="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-1">
        <router-link to="/settings"
          class="flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer outline-none"
          active-class="active-nav text-primary rounded-r-xl"
          :class="[$route.path.startsWith('/settings') ? '' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl']">
          <SvgIcon name="settings" :class="$route.path.startsWith('/settings') ? 'fill-current' : ''" />
          <span class="text-sm font-medium">设置</span>
        </router-link>

        <button @click="toggleTheme"
          class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full text-left outline-none">
          <SvgIcon :name="isDarkMode ? 'light_mode' : 'dark_mode'" />
          <span class="text-sm font-medium">切换主题</span>
        </button>
      </div>

      <!-- 用户信息 -->
      <div class="mt-2 flex items-center gap-3 px-3 pt-2">
        <div
          class="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/20">
          JD
        </div>
        <div class="flex flex-col">
          <span class="text-sm text-slate-900 dark:text-white font-medium">John Doe</span>
          <span class="text-xs text-slate-500">专业版</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

// 初始状态尝试根据 localStorage 获取，否则默认走系统首选项
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme === 'dark';
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const isDarkMode = ref(getInitialTheme());

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
};

// 副作用钩子，同步状态到 HTML 和 本地存储
watchEffect(() => {
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
});
</script>
