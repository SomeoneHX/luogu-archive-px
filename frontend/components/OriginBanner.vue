<!--
  原文归属条：查看洛谷原文、作者、上次更新时间，右侧是保存按钮。
  内容详情页（文章 / 剪贴板 / 用户 / 陶片 / 题目）顶部挂一个。
  compact 时只渲染一行信息条，不渲染标题。
-->
<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

const { fromNow } = useTime()

const props = defineProps<{
  originUrl: string
  title?: string
  compact?: boolean
  authorName?: string
  authorHref?: string
  crawledAt?: string | Date
  contentType: string
  contentId: string
}>()

const relTime = computed(() =>
  props.crawledAt ? fromNow(props.crawledAt) : '未知',
)
</script>

<template>
  <header
    class="flex flex-wrap items-center justify-between gap-3"
    :class="compact
      ? 'rounded-lg border border-border bg-card px-4 py-2.5'
      : 'border-b border-border pb-5'"
  >
    <div class="min-w-0 flex-1">
      <h1
        v-if="title && !compact"
        class="text-2xl font-semibold tracking-tight text-foreground"
      >
        {{ title }}
      </h1>
      <p
        class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground"
        :class="title && !compact ? 'mt-1.5' : ''"
      >
        <a
          :href="originUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ExternalLink class="size-3.5" />
          查看洛谷原文
        </a>
        <span aria-hidden="true">·</span>
        <span v-if="authorName">
          作者：
          <a v-if="authorHref" :href="authorHref" class="text-primary hover:underline">{{ authorName }}</a>
          <span v-else>{{ authorName }}</span>
          ·
        </span>
        <span>上次更新：{{ relTime }}</span>
      </p>
    </div>

    <SaveButton :content-type="contentType" :content-id="contentId" />
  </header>
</template>
