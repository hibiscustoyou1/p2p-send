<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-slate-900 dark:text-white text-lg font-bold flex items-center gap-2">
        当前传输
        <span
          class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{{
          activeCount }}</span>
      </h3>
      <button class="text-primary hover:text-primary-dark text-sm font-medium outline-none"
        @click="$emit('view-all')">查看全部</button>
    </div>

    <div class="flex flex-col gap-3">
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  activeCount: number;
}>();
defineEmits(['view-all']);
</script>
