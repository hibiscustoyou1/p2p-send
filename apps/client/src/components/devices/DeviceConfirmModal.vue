<template>
  <!-- 通用确认操作 Modal -->
  <transition name="modal-fade">
    <div v-if="isVisible" class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      @click.self="$emit('cancel')">
      <!-- 遮罩 -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('cancel')" />

      <!-- 弹框主体 -->
      <div
        class="relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-5">
        <!-- 图标 + 标题 -->
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 flex-shrink-0">
            <SvgIcon name="delete" class="text-[20px]" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">确认操作</h3>
          </div>
        </div>

        <!-- 提示信息 -->
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{{ message }}</p>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-3 justify-end">
          <button @click="$emit('cancel')"
            class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">取消</button>
          <button @click="$emit('confirm')"
            class="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">确认移除</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon.vue';

defineProps<{
  isVisible: boolean;
  message: string;
}>();

defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
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
