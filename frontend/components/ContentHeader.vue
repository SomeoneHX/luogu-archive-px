<script setup lang="ts">
import { Check, Copy, ExternalLink, History } from '@lucide/vue'

/**
 * 内容详情页的通用头部：栏目名 + 标题 + 作者行 + 操作行。
 * 文章、剪贴板、讨论、犇犇共用，标题由调用方通过默认插槽传入。
 */
const props = defineProps<{
  label: string
  author?: any
  crawledAt?: string
  versionCount?: number
  historyTo?: string
  originalHref: string
  markdown?: string
  contentType: string
  contentId: string
}>()

// 洛谷用户名配色直接映射到调色板变量，省掉每种颜色一条 CSS。
const AVATAR_COLORS: Record<string, string> = {
  Gray: 'var(--lg-gray)',
  Blue: 'var(--lg-blue)',
  Green: 'var(--lg-green)',
  Orange: 'var(--lg-orange)',
  Yellow: 'var(--lg-yellow)',
  Red: 'var(--lg-red)',
  Purple: 'var(--lg-purple)',
  Cyan: 'var(--lg-cyan)',
  Black: 'var(--lg-black)',
  Cheater: 'var(--lg-cheater-tag)',
}
const avatarColor = computed(() =>
  AVATAR_COLORS[props.author?.color as string] || 'var(--lg-gray)',
)

const copied = ref(false)
async function copyMarkdown() {
  if (!props.markdown) return
  await navigator.clipboard.writeText(props.markdown)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1400)
}
</script>

<template>
  <header class="border-b border-border pb-6">
    <p class="text-xs font-medium tracking-wide text-muted-foreground">
      {{ label }}
    </p>

    <h1 class="mt-2 text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl">
      <slot>{{ label }}</slot>
    </h1>

    <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <NuxtLink
        v-if="author"
        :to="`/user/${author.uid}`"
        class="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
      >
        <Avatar class="size-8">
          <AvatarImage v-if="author.avatar" :src="author.avatar" :alt="author.name" />
          <AvatarFallback
            class="text-xs font-semibold text-white"
            :style="{ backgroundColor: avatarColor }"
          >
            {{ (author.name || '?').charAt(0).toUpperCase() }}
          </AvatarFallback>
        </Avatar>
        <LuoguUserName :user="author" show-badge no-link />
      </NuxtLink>
      <span v-else>作者未收录</span>

      <Separator orientation="vertical" class="h-4" />

      <span class="text-xs">上次更新 · {{ crawledAt }}</span>

      <NuxtLink
        v-if="versionCount && versionCount > 1 && historyTo"
        :to="historyTo"
        class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <History class="size-3.5" />
        {{ versionCount }} 个历史版本
      </NuxtLink>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" as-child>
        <a :href="originalHref" target="_blank" rel="noopener noreferrer">
          <ExternalLink class="size-3.5" />
          查看原文
        </a>
      </Button>

      <Button variant="outline" size="sm" @click="copyMarkdown">
        <Check v-if="copied" class="size-3.5" />
        <Copy v-else class="size-3.5" />
        {{ copied ? '已复制' : '复制原文' }}
      </Button>

      <SaveButton :content-type="contentType" :content-id="contentId" />
    </div>
  </header>
</template>
