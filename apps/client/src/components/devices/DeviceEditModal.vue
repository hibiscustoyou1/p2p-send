<template>
  <!-- 编辑设备备注名 Modal -->
  <transition name="modal-fade">
    <div v-if="isVisible" class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      @click.self="$emit('cancel')">
      <!-- 遮罩 -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('cancel')" />

      <!-- 弹框主体 -->
      <div
        class="relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-5">
        <!-- 标题 -->
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
            <SvgIcon name="edit" class="text-[20px]" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">编辑设备备注名</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">修改后本地生效</p>
          </div>
        </div>

        <!-- 输入框 -->
        <input ref="inputRef" v-model="inputValue" type="text"
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          placeholder="请输入备注名..." @keyup.enter="handleConfirm" @keyup.esc="$emit('cancel')" />

        <!-- 操作按钮 -->
        <div class="flex items-center gap-3 justify-end">
          <button @click="$emit('cancel')"
            class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">取消</button>
          <button @click="handleConfirm" :disabled="!inputValue.trim()"
            class="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">确认</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

const props = defineProps<{
  isVisible: boolean;
  deviceName: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', newName: string): void;
  (e: 'cancel'): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref('');

// 每次弹框打开时，将初始值同步到输入框并自动聚焦
watch(
  () => props.isVisible,
  async (visible) => {
    if (visible) {
      inputValue.value = props.deviceName;
      await nextTick();
      inputRef.value?.select();
    }
  }
);

const handleConfirm = () => {
  if (!inputValue.value.trim()) return;
  emit('confirm', inputValue.value.trim());
};
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
