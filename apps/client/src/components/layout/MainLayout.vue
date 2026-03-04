<template>
  <!-- 移动端汉堡菜单按钮（仅 md 以下可见） -->
  <button
    class="fixed top-3 left-3 z-50 flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-surface-darker border border-slate-200 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-300 md:hidden transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
    aria-label="打开导航菜单" @click="isSidebarOpen = true">
    <!-- 汉堡图标：三横线 -->
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
      stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  <!-- 移动端遮罩层 -->
  <transition name="fade-overlay">
    <div v-if="isSidebarOpen" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
      @click="isSidebarOpen = false" />
  </transition>

  <!-- 侧边栏：移动端抽屉 + 桌面端固定 -->
  <SideBar :isOpen="isSidebarOpen" @close="isSidebarOpen = false" />

  <!-- 右侧主内容区 -->
  <main class="flex-1 relative flex flex-col min-h-screen overflow-y-auto">
    <!-- 全局氛围光效背景 (仅作视觉点缀) -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        class="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] dark:blur-[120px] transition-all duration-700">
      </div>
      <div
        class="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[100px] transition-all duration-700">
      </div>
    </div>

    <div class="md:pt-0 flex-1 flex flex-col">
      <slot></slot>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SideBar from './SideBar.vue';

// 控制移动端侧边栏抽屉的开关状态
const isSidebarOpen = ref(false);
</script>

<style scoped>
/* 遮罩层淡入淡出 */
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}
</style>
