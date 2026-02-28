<template>
  <component :is="layoutComponent">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </component>
  <AuthGuardModal :isVisible="showAuthGuard" @success="handleAuthSuccess" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import AuthGuardModal from '@/components/common/AuthGuardModal.vue';
import { signalingService } from '@/services/socket';
import { settingsManager } from '@/services/settingsManager';

const route = useRoute();
const showAuthGuard = ref(false);

const layoutComponent = computed(() => {
  if (route.meta.layout === 'MainLayout') {
    return MainLayout;
  }
  return 'div'; // Fallback 无布局
});

onMounted(() => {
  // 设置并应用暗黑/白日主题
  settingsManager.applyCurrentTheme();

  // 添加基于全局认证墙的心跳错误捕捉
  const errorHandler = (err: any) => {
    if (err.message === 'Authentication error' || err.message === 'Invalid token') {
      showAuthGuard.value = true;
    }
  };

  // 对于可能被拒接的入口予以监控
  signalingService.onConnectError(errorHandler);
});

onUnmounted(() => {
  signalingService.onConnectError(() => {});
});

const handleAuthSuccess = () => {
  showAuthGuard.value = false;
};
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
