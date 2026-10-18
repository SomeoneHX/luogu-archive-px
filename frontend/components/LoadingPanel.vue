<script setup lang="ts">
// 通用加载窗口：列表/详情首屏未就绪时的占位提示。
defineProps<{
  title?: string
  text?: string
}>()
</script>

<template>
  <div
    class="flex min-h-[220px] items-center justify-center p-6"
    role="status"
    aria-live="polite"
  >
    <div class="flex w-full max-w-[520px] items-center gap-4 rounded-xl border border-border bg-card px-6 py-5">
      <div class="size-7 shrink-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" aria-hidden="true" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-foreground">{{ title || '加载中…' }}</p>
        <p v-if="text" class="mt-0.5 text-xs text-muted-foreground">{{ text }}</p>
      </div>
    </div>
  </div>
</template>
