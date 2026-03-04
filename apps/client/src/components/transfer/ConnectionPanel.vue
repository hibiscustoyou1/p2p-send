<template>
  <header
    class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel rounded-xl p-6">
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-3">
        <span
          class="flex h-3 w-3 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] dark:shadow-[0_0_12px_rgba(16,185,129,0.6)] bg-accent-success"></span>
        <p class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">您的设备已准备就绪</p>
      </div>
      <div class="flex items-end gap-3">
        <h2 class="text-slate-900 dark:text-slate-100 text-4xl font-bold tracking-tight">{{ deviceCode }}</h2>
        <button class="text-primary hover:text-primary-dark mb-1 transition-colors outline-none" title="复制验证码"
          @click="copyCode">
          <SvgIcon name="content_copy" class="text-xl" />
        </button>
      </div>
      <p class="text-slate-500 text-sm">分享此连接码以安全接收文件。</p>
    </div>

    <div
      class="flex flex-wrap items-center justify-center gap-3 sm:gap-4 bg-slate-100/50 dark:bg-slate-900/50 p-2 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/50 w-full md:w-auto">
      <div class="flex gap-1.5 sm:gap-2 w-full sm:w-auto justify-between">
        <input v-for="(_, index) in inputCodes" :key="index" v-model="inputCodes[index]"
          :ref="(el) => inputs[index] = el as HTMLInputElement" @input="onInput($event, index)"
          @keydown.delete="onKeydown(index, $event)"
          class="flex-1 w-0 min-w-[2.25rem] max-w-[3rem] h-11 sm:h-12 text-center bg-white dark:bg-slate-800 rounded-lg border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base md:text-lg focus:ring-primary focus:border-primary placeholder-slate-400 dark:placeholder-slate-600 transition-all shadow-sm outline-none"
          maxlength="1" placeholder="•" type="text" />
      </div>
      <button @click="handleConnect"
        class="flex-1 sm:flex-none w-full sm:w-auto justify-center h-11 sm:h-12 px-6 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2 outline-none">
        <span>连接</span>
        <SvgIcon name="arrow_forward" class="text-sm" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

const props = defineProps<{
  deviceCode: string;
}>();

const emit = defineEmits<{
  (e: 'connect', code: string): void;
}>();

const inputCodes = ref<string[]>(['', '', '', '', '', '']);
const inputs = ref<HTMLInputElement[]>([]);

const onInput = (event: Event, index: number) => {
  const val = (event.target as HTMLInputElement).value;
  // 如果有输入值且不是最后一个框，自动跳到下一个
  if (val && index < 5) {
    inputs.value[index + 1]?.focus();
  }
};

const onKeydown = (index: number, event: KeyboardEvent) => {
  // 处理按退格键时自动跳回上一个输入框
  if (!inputCodes.value[index] && index > 0) {
    inputs.value[index - 1]?.focus();
  }
};

const copyCode = () => {
  navigator.clipboard.writeText(props.deviceCode);
  // TODO: Toast
};

const handleConnect = () => {
  const code = inputCodes.value.join('');
  if (code.length === 6) {
    emit('connect', code);
  }
};
</script>
