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

        <button ref="themeToggleBtnRef" data-testid="theme-toggle" @click="toggleTheme"
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
import { ref } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { settingsManager } from '@/services/settingsManager';

const isDarkMode = ref(settingsManager.getSettings().theme === 'dark');
const themeToggleBtnRef = ref<HTMLButtonElement | null>(null);

const toggleTheme = () => {
  const btn = themeToggleBtnRef.value;
  const nextDark = !isDarkMode.value;

  // 计算按钮中心圆心坐标与屏幕最大覆盖半径
  const rect = btn?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const maxR = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // 将圆心坐标与半径写入 CSS 自定义变量，供 @keyframes 读取
  const root = document.documentElement;
  root.style.setProperty('--ripple-x', `${x}px`);
  root.style.setProperty('--ripple-y', `${y}px`);
  root.style.setProperty('--ripple-max-r', `${maxR}px`);
  root.dataset.themeDirection = nextDark ? 'to-dark' : 'to-light';

  // 优雅降级：浏览器不支持 View Transition API 时直接切换
  if (!document.startViewTransition) {
    isDarkMode.value = nextDark;
    settingsManager.updateSettings({ theme: nextDark ? 'dark' : 'light' });
    return;
  }

  // 触发圆圈扩散/聚拢过渡
  const transition = document.startViewTransition(() => {
    isDarkMode.value = nextDark;
    settingsManager.updateSettings({ theme: nextDark ? 'dark' : 'light' });
  });

  // 动画结束后清理临时 data 属性
  transition.finished.finally(() => {
    delete root.dataset.themeDirection;
  });
};
</script>
