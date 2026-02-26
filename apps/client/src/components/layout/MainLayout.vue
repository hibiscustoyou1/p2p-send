<template>
  <SideBar />
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

    <!-- 路由视图渲染区 -->
    <slot></slot>
  </main>
</template>

<script setup lang="ts">
import SideBar from './SideBar.vue';
</script>
