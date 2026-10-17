<script setup lang="ts">
import { Check, Copy, ExternalLink, History } from '@lucide/vue'

const { format } = useTime()

const route = useRoute()
const api = useApi()
const id = route.params.id as string

interface ArticleDetail {
  article_id: string
  title: string
  content_md: string
  admin_note: string | null
  author: any
  crawled_at: string
  version_count: number
}

// 不阻塞页面首屏：先渲染页面骨架，再由浏览器请求后端接口。
const { data, error, pending } = useLazyAsyncData(`article-${id}`, () =>
  api<ArticleDetail>(`/article/${id}`),
  { server: false },
)

const { render } = useMarkdown()
const html = computed(() => (data.value ? render(data.value.content_md) : ''))

const contentRef = ref<HTMLElement | null>(null)
useCopyCode(contentRef)

const copiedOriginal = ref(false)
const crawledAtText = computed(() =>
  data.value ? format(data.value.crawled_at) : '',
)

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
  AVATAR_COLORS[data.value?.author?.color as string] || 'var(--lg-gray)',
)

async function copyOriginalMarkdown() {
  if (!data.value?.content_md) return
  await navigator.clipboard.writeText(data.value.content_md)
  copiedOriginal.value = true
  setTimeout(() => { copiedOriginal.value = false }, 1400)
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
    <div v-if="pending" class="space-y-5 py-2">
      <Skeleton class="h-8 w-3/5" />
      <div class="flex items-center gap-3">
        <Skeleton class="size-9 rounded-full" />
        <Skeleton class="h-4 w-32" />
      </div>
      <div class="space-y-2.5 pt-2">
        <Skeleton v-for="i in 8" :key="i" class="h-4" :class="i % 4 === 0 ? 'w-2/3' : 'w-full'" />
      </div>
    </div>

    <Card v-else-if="error" class="gap-0 py-0">
      <CardContent class="flex flex-col items-center px-6 py-12 text-center">
        <h2 class="text-base font-semibold text-foreground">
          {{ error.data?.message || '加载失败' }}
        </h2>
        <p v-if="error.statusCode === 404" class="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          如果本站从未爬取过这篇文章，刚才已触发一次爬取，稍等片刻刷新即可。
        </p>
      </CardContent>
    </Card>

    <template v-else-if="data">
      <header class="border-b border-border pb-6">
        <p class="text-xs font-medium tracking-wide text-muted-foreground">
          文章归档
        </p>
        <h1 class="mt-2 text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl">
          {{ data.title }}
        </h1>

        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <NuxtLink
            v-if="data.author"
            :to="`/user/${data.author.uid}`"
            class="flex items-center gap-2 text-foreground transition-colors hover:text-primary"
          >
            <Avatar class="size-8">
              <AvatarImage v-if="data.author.avatar" :src="data.author.avatar" :alt="data.author.name" />
              <AvatarFallback
                class="text-xs font-semibold text-white"
                :style="{ backgroundColor: avatarColor }"
              >
                {{ (data.author.name || '?').charAt(0).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <LuoguUserName :user="data.author" show-badge no-link />
          </NuxtLink>
          <span v-else>作者未收录</span>

          <Separator orientation="vertical" class="h-4" />

          <span class="text-xs">上次更新 · {{ crawledAtText }}</span>

          <NuxtLink
            v-if="data.version_count > 1"
            :to="`/article/${id}/history`"
            class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <History class="size-3.5" />
            {{ data.version_count }} 个历史版本
          </NuxtLink>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" as-child>
            <a
              :href="`https://www.luogu.com.cn/article/${id}`"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink class="size-3.5" />
              查看原文
            </a>
          </Button>

          <Button variant="outline" size="sm" @click="copyOriginalMarkdown">
            <Check v-if="copiedOriginal" class="size-3.5" />
            <Copy v-else class="size-3.5" />
            {{ copiedOriginal ? '已复制' : '复制原文' }}
          </Button>

          <SaveButton content-type="article" :content-id="id" />
        </div>
      </header>

      <!-- 与洛谷文章页保持一致：红色引用块 + 固定的“管理组提示：”标题。 -->
      <ArticleAdminNote :note="data.admin_note" />

      <article ref="contentRef" class="lg-content mt-6" v-html="html" />
    </template>
  </div>
</template>
