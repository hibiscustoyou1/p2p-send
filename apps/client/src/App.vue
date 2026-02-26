<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';

const route = useRoute();

const layoutComponent = computed(() => {
  if (route.meta.layout === 'MainLayout') {
    return MainLayout;
  }
  return 'div'; // Fallback 无布局
});
</script>

<style>
/* 全局样式补充，重置一些基础滚动行为 */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
