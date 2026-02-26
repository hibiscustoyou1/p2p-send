<template>
  <svg aria-hidden="true" class="inline-block fill-current align-middle" :style="{ width: '1em', height: '1em' }">
    <use :href="symbolId" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  name: string;
}>();

const symbolId = computed(() => `#icon-${props.name}`);
</script>
