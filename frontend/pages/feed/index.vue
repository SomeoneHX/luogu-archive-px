<script setup lang="ts">
const api = useApi()
const { smart } = useTime()
const PAGE_SIZE = 30

interface FeedItem {
  id: number
  type: number
  time: string
  content_md: string
  merged_suffix_md: string | null
  merged_from_id: number | null
  merged_link_md?: string[]
  merged_image_md?: string[]
  user: { uid: number; name: string; color: string; badge: string | null; avatar: string | null } | null
}

// `/feed` 列表页与 `/feed/{id}` 详情页是同级路由；首屏先显示，再拉第一页犇犇。
const { data: firstPage, pending: firstPending } = useLazyAsyncData('feed-first', () =>
  api<FeedItem[]>('/feed', { query: { limit: PAGE_SIZE } }),
  { server: false },
)

const items = ref<FeedItem[]>([])
const loading = ref(false)
const beforeTs = ref<string | null>(null)
const noMore = ref(false)

// 第一页回来后再填充列表，避免页面导航被接口阻塞。
watch(firstPage, (page) => {
  if (!page) return
  items.value = [...page]
  beforeTs.value = page.length ? page[page.length - 1].time : null
  noMore.value = page.length === 0
}, { immediate: true })

async function loadMore() {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const q: Record<string, any> = { limit: PAGE_SIZE }
    if (beforeTs.value) q.before = beforeTs.value
    const page = await api<FeedItem[]>('/feed', { query: q })
    items.value.push(...page)
    if (page.length === 0) {
      noMore.value = true
    } else {
      beforeTs.value = page[page.length - 1].time
    }
  } finally {
    loading.value = false
  }
}

const { render } = useMarkdown()
const completionTip = '此内容由洛谷档案馆根据回复链自动补全'

function markMergedMedia(html: string, links: string[], images: string[]) {
  let marked = html
  for (const link of links) {
    const anchor = render(link).match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0]
    if (!anchor || !marked.includes(anchor)) continue
    marked = marked.replace(
      anchor,
      `<span class="feed-completion-wrap" tabindex="0"><span class="feed-auto-merged-link">${anchor}</span><span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`,
    )
  }
  for (const imageMd of images) {
    const image = render(imageMd).match(/<img\b[^>]*>/i)?.[0]
    if (!image || !marked.includes(image)) continue
    marked = marked.replace(
      image,
      `<span class="feed-completion-wrap feed-auto-merged-image" tabindex="0">${image}<span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`,
    )
  }
  return marked
}

function renderMergedSuffix(content: string, mergedSuffix: string) {
  const prefix = content.slice(0, Math.max(0, content.length - mergedSuffix.length))
  const prefixHtml = render(prefix)
  const suffixHtml = render(mergedSuffix)
  const suffixParagraph = suffixHtml.match(/^<p>([\s\S]*)<\/p>\s*$/)

  // 普通文字尾巴接回原段落；只有原 Markdown 明确换行或包含多个块时才另起一行。
  if (!mergedSuffix.startsWith('\n') && suffixParagraph && /<\/p>\s*$/.test(prefixHtml)) {
    const markedSuffix = `<span class="feed-completion-wrap" tabindex="0"><span class="feed-auto-merged">${suffixParagraph[1]}</span><span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`
    return prefixHtml.replace(/<\/p>\s*$/, `${markedSuffix}</p>`)
  }

  return prefixHtml
    + `<div class="feed-completion-wrap feed-completion-block" tabindex="0"><div class="feed-auto-merged">${suffixHtml}</div><span class="feed-completion-popover" role="tooltip">${completionTip}</span></div>`
}

function feedHtml(
  content: string,
  mergedSuffix: string | null,
  mergedLinks: string[],
  mergedImages: string[],
) {
  let html = mergedSuffix
    ? renderMergedSuffix(content, mergedSuffix)
    : render(content)
  if (mergedLinks.length || mergedImages.length) {
    html = markMergedMedia(html, mergedLinks, mergedImages)
  }
  return html
}

const listRef = ref<HTMLElement | null>(null)
useCopyCode(listRef)
</script>

<template>
  <div>
    <header class="border-b border-border pb-3">
      <h1 class="text-xl font-semibold tracking-tight">伪全网犇</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        汇总本站爬到的所有用户的犇犇，按时间倒序。
      </p>
    </header>

    <ul v-if="firstPending && !items.length" class="mt-4 space-y-2.5">
      <li v-for="i in 6" :key="i" class="flex gap-3 rounded-xl border border-border bg-card p-4">
        <Skeleton class="size-8 shrink-0 rounded-full" />
        <div class="min-w-0 flex-1 space-y-2.5">
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-3.5 w-full max-w-[80%]" />
          <Skeleton class="h-3.5 w-full max-w-[55%]" />
        </div>
      </li>
    </ul>

    <template v-else>
      <ul v-if="items.length" ref="listRef" class="mt-4 space-y-2.5">
        <li
          v-for="f in items"
          :key="f.id"
          class="flex gap-3 rounded-xl border border-border bg-card p-4"
        >
          <NuxtLink :to="f.user ? `/user/${f.user.uid}` : ''" class="shrink-0" :class="{ 'pointer-events-none': !f.user }">
            <UserAvatar :user="f.user" size="lg" />
          </NuxtLink>

          <div class="min-w-0 flex-1 [overflow-wrap:anywhere] [&_a]:break-all">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <LuoguUserName :user="f.user" show-badge truncate />
              <time class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ smart(f.time) }}</time>
            </div>
            <div
              class="feed-content lg-content mt-2 text-[15px] leading-relaxed"
              v-html="feedHtml(f.content_md, f.merged_suffix_md, f.merged_link_md || [], f.merged_image_md || [])"
            />
            <div class="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5 text-xs text-muted-foreground">
              <NuxtLink :to="`/feed/${f.id}`" class="tabular-nums transition-colors hover:text-foreground">
                #{{ f.id }}
              </NuxtLink>
              <FeedReplyButton :content="f.content_md" :sender-name="f.user?.name" />
            </div>
          </div>
        </li>
      </ul>

      <div v-else class="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        还没有抓到任何犇犇
      </div>

      <div class="mt-5 flex justify-center">
        <Button v-if="!noMore" variant="outline" :disabled="loading" @click="loadMore">
          {{ loading ? '加载中…' : '加载更多' }}
        </Button>
        <span v-else-if="items.length" class="text-xs text-muted-foreground">没有更多了</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 犇犇正文是 v-html 生成，自动补回内容的下划线与悬浮说明只能走 :deep。 */
.feed-content :deep(img) {
  max-width: 100%;
  height: auto;
}
.feed-content :deep(.feed-completion-wrap) {
  position: relative;
  display: inline;
  cursor: help;
  outline: none;
}
.feed-content :deep(.feed-completion-block) {
  display: block;
  width: fit-content;
  max-width: 100%;
}
.feed-content :deep(.feed-auto-merged),
.feed-content :deep(.feed-auto-merged-link),
.feed-content :deep(.feed-auto-merged-link a) {
  text-decoration-line: underline;
  text-decoration-color: #7db9e8;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.feed-content :deep(.feed-auto-merged img),
.feed-content :deep(.feed-auto-merged-image) {
  box-shadow: 0 2px 0 #7db9e8;
}
.feed-content :deep(.feed-auto-merged-image) {
  display: inline-block;
  max-width: 100%;
}
.feed-content :deep(.feed-auto-merged-image img) {
  display: block;
}
.feed-content :deep(.feed-completion-popover) {
  position: absolute;
  z-index: 30;
  top: calc(100% + 9px);
  left: 50%;
  display: none;
  width: max-content;
  max-width: 280px;
  padding: 8px 10px;
  transform: translateX(-50%);
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--card);
  color: inherit;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
  font-size: 12px;
  line-height: 1.55;
  text-align: left;
  white-space: normal;
  pointer-events: none;
}
.feed-content :deep(.feed-completion-wrap:hover > .feed-completion-popover),
.feed-content :deep(.feed-completion-wrap:focus-within > .feed-completion-popover) {
  display: block;
}
</style>
