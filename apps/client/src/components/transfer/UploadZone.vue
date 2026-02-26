<template>
  <section class="relative group" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop">
    <!-- 发光背景层，支持拖拽时高亮显示 -->
    <div
      class="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-600/20 dark:from-primary/30 dark:to-purple-600/30 rounded-xl blur transition duration-500"
      :class="isDragging ? 'opacity-100 scale-[1.02]' : 'opacity-0 group-hover:opacity-100'">
    </div>
    <div
      class="relative flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border-2 border-dashed transition-colors cursor-pointer w-full h-80"
      :class="isDragging ? 'border-primary/80 dark:border-primary/80' : 'border-slate-300 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50'"
      @click="triggerFileInput">
      <div
        class="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 transition-transform duration-300"
        :class="isDragging ? 'scale-110' : 'group-hover:scale-110'">
        <SvgIcon name="cloud_upload" class="text-primary text-5xl" />
      </div>
      <h3 class="text-slate-900 dark:text-white text-2xl font-bold mb-2">
        {{ isDragging ? '松开以上传文件' : '拖拽文件至此' }}
      </h3>
      <p class="text-slate-500 dark:text-slate-400 text-base mb-8 text-center max-w-md">或点击浏览本地存储。支持 ZIP、PKG、DMG
        及大型媒体文件。</p>
      <button
        class="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm outline-none">
        浏览文件
      </button>
      <input type="file" ref="fileInput" class="hidden" multiple @change="onFileSelect" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SvgIcon from '@/components/common/SvgIcon.vue';

const emit = defineEmits<{
  (e: 'files-selected', files: FileList | File[]): void;
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const onDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    emit('files-selected', event.dataTransfer.files);
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    emit('files-selected', target.files);
  }
  // 清除 value 保证同一个文件能反复选
  if (target.value) {
    target.value = '';
  }
};
</script>
