<script setup lang="ts">
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

const route = useRoute()
const api = useApi()
const { smart } = useTime()
const { render } = useMarkdown()
const feedId = String(route.params.id)
const contentRef = ref<HTMLElement | null>(null)
const completionTip = '此内容由洛谷档案馆根据回复链自动补全'

const { data: feed, pending, error } = useLazyAsyncData(
  `feed-${feedId}`,
  () => api<FeedItem>(`/feed/${feedId}`),
  { server: false },
)

function markMergedMedia(html: string, links: string[], images: string[]) {
  let marked = html
  for (const link of links) {
    const anchor = render(link).match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0]
    if (!anchor || !marked.includes(anchor)) continue
    marked = marked.replace(anchor, `<span class="feed-completion-wrap" tabindex="0"><span class="feed-auto-merged-link">${anchor}</span><span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`)
  }
  for (const imageMd of images) {
    const image = render(imageMd).match(/<img\b[^>]*>/i)?.[0]
    if (!image || !marked.includes(image)) continue
    marked = marked.replace(image, `<span class="feed-completion-wrap feed-auto-merged-image" tabindex="0">${image}<span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`)
  }
  return marked
}

function renderMergedSuffix(content: string, mergedSuffix: string) {
  const prefix = content.slice(0, Math.max(0, content.length - mergedSuffix.length))
  const prefixHtml = render(prefix)
  const suffixHtml = render(mergedSuffix)
  const suffixParagraph = suffixHtml.match(/^<p>([\s\S]*)<\/p>\s*$/)
  if (!mergedSuffix.startsWith('\n') && suffixParagraph && /<\/p>\s*$/.test(prefixHtml)) {
    const marked = `<span class="feed-completion-wrap" tabindex="0"><span class="feed-auto-merged">${suffixParagraph[1]}</span><span class="feed-completion-popover" role="tooltip">${completionTip}</span></span>`
    return prefixHtml.replace(/<\/p>\s*$/, `${marked}</p>`)
  }
  return prefixHtml + `<div class="feed-completion-wrap feed-completion-block" tabindex="0"><div class="feed-auto-merged">${suffixHtml}</div><span class="feed-completion-popover" role="tooltip">${completionTip}</span></div>`
}

function feedHtml(item: FeedItem) {
  let html = item.merged_suffix_md
    ? renderMergedSuffix(item.content_md, item.merged_suffix_md)
    : render(item.content_md)
  html = markMergedMedia(html, item.merged_link_md || [], item.merged_image_md || [])
  return html
}

useCopyCode(contentRef)
</script>

<template>
  <div class="pt-1">
    <LoadingPanel v-if="pending" title="loading……" text="" />

    <div v-else-if="error" class="rounded-xl border border-dashed border-border p-10 text-center">
      <p class="text-sm font-medium text-foreground">{{ error.data?.message || '犇犇加载失败' }}</p>
      <Button variant="outline" size="sm" class="mt-4" @click="navigateTo('/feed')">返回犇犇列表</Button>
    </div>

    <article v-else-if="feed" class="flex gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <NuxtLink :to="feed.user ? `/user/${feed.user.uid}` : ''" class="shrink-0" :class="{ 'pointer-events-none': !feed.user }">
        <UserAvatar :user="feed.user" size="xl" />
      </NuxtLink>

      <div class="min-w-0 flex-1 [overflow-wrap:anywhere] [&_a]:break-all">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <LuoguUserName :user="feed.user" show-badge truncate />
          <time class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ smart(feed.time) }}</time>
        </div>
        <div
          ref="contentRef"
          class="feed-content lg-content mt-2 text-[15px] leading-relaxed"
          v-html="feedHtml(feed)"
        />
        <div class="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5 text-xs text-muted-foreground">
          <span class="tabular-nums">#{{ feed.id }}</span>
          <FeedReplyButton :content="feed.content_md" :sender-name="feed.user?.name" />
        </div>
      </div>
    </article>
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
