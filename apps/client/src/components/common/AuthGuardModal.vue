<template>
  <div v-if="isVisible"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md transition-opacity">
    <div
      class="glass-panel w-full max-w-sm rounded-2xl p-8 flex flex-col items-center shadow-2xl animate-fade-in relative overflow-hidden ring-1 ring-white/20 dark:ring-white/10">

      <!-- 视觉点缀底纹 -->
      <div
        class="absolute -top-[50px] -right-[50px] w-32 h-32 bg-primary/20 rounded-full blur-[40px] pointer-events-none">
      </div>

      <!-- Icon 圆环 -->
      <div
        class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 ring-4 ring-white/50 dark:ring-black/20">
        <SvgIcon name="admin_panel_settings" class="text-3xl" />
      </div>

      <!-- Header -->
      <h3 class="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">私有化通行证</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 text-center mb-8 px-2 leading-relaxed">
        安全墙已启动。此为您的私人服务频道，请输入全局访问口令以建立 P2P 直通隧道。
      </p>

      <!-- Input Section -->
      <div class="w-full relative px-2">
        <label for="accessToken" class="sr-only">Access Token</label>
        <div class="relative flex items-center">
          <SvgIcon name="key" class="absolute left-4 text-slate-400 dark:text-slate-500 text-lg" />
          <input id="accessToken" v-model="inputToken" :type="showPassword ? 'text' : 'password'"
            @keyup.enter="handleSubmit"
            class="w-full bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10 rounded-xl py-3.5 pl-11 pr-11 text-sm text-slate-800 dark:text-white outline-none transition-all placeholder:text-slate-400 font-medium font-mono"
            placeholder="输入门禁口令..." autocomplete="off" autofocus />
          <button type="button" @click="showPassword = !showPassword"
            class="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <SvgIcon :name="showPassword ? 'visibility_off' : 'visibility'" class="text-[18px]" />
          </button>
        </div>

        <!-- Error State -->
        <p v-if="errorMsg" class="text-xs text-rose-500 font-medium mt-2 flex items-center gap-1 animate-pulse">
          <SvgIcon name="error" class="text-[14px]" /> {{ errorMsg }}
        </p>
      </div>

      <!-- Actions -->
      <button @click="handleSubmit" :disabled="!inputToken.trim() || isSubmitting"
        class="mt-6 w-[calc(100%-1rem)] bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-bold py-3.5 rounded-xl shadow-[0_8px_16px_rgba(59,130,246,0.25)] hover:shadow-[0_12px_20px_rgba(59,130,246,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
        <SvgIcon v-if="isSubmitting" name="refresh" class="animate-spin text-[18px]" />
        <span>{{ isSubmitting ? '连接中...' : '授权验证并连接' }}</span>
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { settingsManager } from '@/services/settingsManager';
import { signalingService } from '@/services/socket';

const props = defineProps<{
  // 外部通过 ref 或 v-model 控制显示隐藏
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'success'): void; // 密码验证成功
}>();

const inputToken = ref('');
const showPassword = ref(false);
const errorMsg = ref('');
const isSubmitting = ref(false);

// 每次打开清空报错状态
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    errorMsg.value = '';
    // 如果已经有缓存过的错误 Token，带上以便直观重输
    inputToken.value = settingsManager.getAccessToken();
  }
});

const handleSubmit = async () => {
  if (!inputToken.value.trim() || isSubmitting.value) return;

  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    // 1. 保存设置里输入的口令
    settingsManager.updateSettings({ globalAccessToken: inputToken.value.trim() });

    // 2. 命令 socket 使用新的口令强制夺权连接
    // (如果此时是在外层 App 级进行初始化拦截，此处调用相当于手动补发起 connect)
    await signalingService.connect();

    // 如果没有被服务器扔 Error，说明 Auth 验证成功
    emit('success');
  } catch (err: any) {
    // 被看门狗抛出错误：说明口令不匹配
    errorMsg.value = err.message || '握手失败，口令错误或服务器无响应。';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.animate-fade-in {
  animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes modalEnter {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }

  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
