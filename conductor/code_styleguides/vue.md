# 🟢 Vue 3 + Tailwind 开发规范

## 1. 组件标准结构组织 (Component Anatomy)
所有的 `.vue` 单文件组件 (SFC) 必须严格遵守自上而下的结构分层：
```vue
<template>
  <!-- 1. 架构视图层：承载 HTML，必须位于最顶端，易于后续迅速审查 DOM 节点 -->
</template>

<script setup lang="ts">
  // 2. 逻辑控制层：导入类型、定义 Pinia Store、处理声明周期
</script>

<style scoped>
  /* 3. 样式覆写区：建议最小化，优先推荐 Tailwind classes，不得在此滥写全局 */
</style>
```

## 2. UI 一致性与设计审美 (Aesthetic Design Rules)
- **原生 Tailwind 范式强约束**：所有的间距 (padding/margin)、色盘、文本粗细，强制借由 Tailwind 的 Utility Classes 进行拼装组合，放弃手写传统 CSS rules。
- **高质感摒弃廉价感**：不再满足于最基础色块拼装的“AI样板”效果，主动投入更为深度的排版细节调整，如利用 `ring` 强调状态、借助微过渡 `transition-all duration-300` 加持 hover、恰到好处地添加 `shadow-md/sm` 层次等。
- **严禁滥建工具类**：绝对不允许在独立业务组件的 `<style scoped>` 块里去重复发明轮子（比如自己拼写出一个 `.my-flex-center` 类名），必须熟练组合复用 Tailwind 的原子语法集合。
