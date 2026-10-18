<script setup lang="ts">
import { Check, ChevronDown, Clock3, Copy, ExternalLink, History } from '@lucide/vue'

const { format, smart } = useTime()

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

interface VersionEntry {
  id: number
  title: string | null
  content_md: string
  crawled_at: string
  is_current: boolean
}

// 不阻塞页面首屏：先渲染页面骨架，再由浏览器请求后端接口。
const { data, error, pending, refresh } = useLazyAsyncData(`article-${id}`, () =>
  api<ArticleDetail>(`/article/${id}`),
  { server: false },
)

const { data: history, pending: historyPending } = useLazyAsyncData(`article-history-${id}`, () =>
  api<{ versions: VersionEntry[] }>(`/article/${id}/history`),
  { server: false },
)

const versions = computed(() => history.value?.versions || [])
const selected = ref<VersionEntry | null>(null)
watchEffect(() => {
  if (!selected.value && versions.value.length) {
    selected.value = versions.value.find(v => v.is_current) || versions.value[0]
  }
})
function selectVersion(version: VersionEntry) {
  selected.value = version
}

const { render } = useMarkdown()
const html = computed(() => (selected.value ? render(selected.value.content_md) : ''))

const contentRef = ref<HTMLElement | null>(null)
useCopyCode(contentRef)

// 版本列表在桌面端默认展开，移动端收起（与上游一致）。
const historyOpen = ref(true)
let media: MediaQueryList | undefined
onMounted(() => {
  media = window.matchMedia('(max-width: 1023px)')
  historyOpen.value = !media.matches
  media.addEventListener('change', onMediaChange)
})
function onMediaChange() {
  historyOpen.value = !media?.matches
}
onBeforeUnmount(() => media?.removeEventListener('change', onMediaChange))

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copyOriginal() {
  if (!selected.value) return
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(selected.value.content_md)
    copied.value = true
    copyTimer = setTimeout(() => { copied.value = false }, 1600)
  } catch {}
}
onBeforeUnmount(() => clearTimeout(copyTimer))
useHead(() => ({ title: data.value ? `${data.value.title} - 洛谷档案馆` : '文章 - 洛谷档案馆' }))

</script>

<template>
  <div class="mx-auto w-full">
    <div v-if="pending" class="mx-auto max-w-3xl space-y-5 py-2">
      <Skeleton class="h-8 w-3/5" />
      <div class="flex items-center gap-3">
        <Skeleton class="size-9 rounded-full" />
        <Skeleton class="h-4 w-32" />
      </div>
      <div class="space-y-2.5 pt-2">
        <Skeleton v-for="i in 8" :key="i" class="h-4" :class="i % 4 === 0 ? 'w-2/3' : 'w-full'" />
      </div>
    </div>

    <div v-else-if="error" class="mx-auto max-w-3xl rounded-xl border border-dashed border-border p-10 text-center">
      <h2 class="text-base font-semibold text-foreground">
        {{ error.data?.message || '加载失败' }}
      </h2>
      <p v-if="error.statusCode === 404" class="mt-2 text-sm leading-relaxed text-muted-foreground">
        如果本站从未爬取过这篇文章，刚才已触发一次爬取，稍等片刻刷新即可。
      </p>
    </div>

    <div v-else-if="data" class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:gap-8">
      <!-- 历史版本（左侧 sticky，点版本直接切换正文） -->
      <aside class="min-w-0 lg:col-start-1 lg:row-span-2">
        <div class="sticky top-4">
          <button
            type="button"
            class="flex w-full items-center gap-2 border-b border-border pb-3 text-left"
            :aria-expanded="historyOpen"
            @click="historyOpen = !historyOpen"
          >
            <Clock3 class="size-4 text-muted-foreground" />
            <h2 class="flex-1 text-sm font-semibold tracking-tight">历史版本</h2>
            <ChevronDown class="size-4 text-muted-foreground transition-transform" :class="historyOpen ? '' : '-rotate-90'" />
          </button>

          <div v-show="historyOpen" class="pt-3">
            <p v-if="historyPending" class="text-[13px] text-muted-foreground">正在加载版本…</p>
            <ol v-else-if="versions.length">
              <li
                v-for="(version, index) in versions"
                :key="version.id"
                class="relative pl-[22px]"
              >
                <span
                  v-if="index < versions.length - 1"
                  class="absolute bottom-[-6px] left-[6px] top-3 w-0.5 bg-border"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  class="relative grid w-full gap-0.5 pb-4 text-left text-[13px] leading-snug"
                  :aria-current="selected === version ? 'true' : undefined"
                  @click="selectVersion(version)"
                >
                  <span
                    class="absolute left-[-22px] top-1 size-3 rounded-full border-2 bg-background"
                    :class="selected === version ? 'border-primary' : 'border-muted-foreground/60'"
                    aria-hidden="true"
                  />
                  <span class="flex items-center gap-1.5 font-medium" :class="selected === version ? 'text-primary' : 'text-foreground'">
                    版本 {{ versions.length - index }}
                    <span
                      v-if="version.is_current"
                      class="rounded-full border border-[var(--lg-green)] px-1.5 py-px text-[10px] text-[var(--lg-green)]"
                    >最新</span>
                  </span>
                  <span v-if="version.title" class="line-clamp-2 text-muted-foreground">{{ version.title }}</span>
                  <time class="tabular-nums text-muted-foreground" :datetime="version.crawled_at">
                    {{ format(version.crawled_at, 'YYYY/M/D HH:mm:ss') }}
                  </time>
                </button>
              </li>
            </ol>
            <p v-else class="text-[13px] text-muted-foreground">暂无历史版本</p>
          </div>
        </div>
      </aside>

      <!-- 中栏：标题 + 操作行 + 正文，裸排 + border-b，正文直接沉底 -->
      <div class="min-w-0 lg:col-start-2 lg:row-span-2">
        <p class="text-xs font-medium tracking-wide text-muted-foreground">文章归档</p>

        <h1 class="mt-2 text-2xl font-bold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl">
          {{ data.title }}
        </h1>

        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <NuxtLink
            v-if="data.author"
            :to="`/user/${data.author.uid}`"
            class="flex min-w-0 items-center gap-2 text-foreground transition-colors hover:text-primary"
          >
            <UserAvatar :user="data.author" size="lg" />
            <LuoguUserName :user="data.author" show-badge truncate />
          </NuxtLink>
          <span v-else>作者未收录</span>

          <span class="text-xs">上次更新 · {{ smart(data.crawled_at) }}</span>

          <NuxtLink
            v-if="versions.length > 1"
            :to="`/article/${id}/history`"
            class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <History class="size-3.5" />
            {{ versions.length }} 个历史版本
          </NuxtLink>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2 border-b border-border pb-6">
          <Button variant="outline" size="sm" as-child>
            <a :href="`https://www.luogu.com.cn/article/${id}`" target="_blank" rel="noopener noreferrer">
              <ExternalLink class="size-3.5" />
              查看原文
            </a>
          </Button>
          <Button variant="outline" size="sm" @click="copyOriginal">
            <Check v-if="copied" class="size-3.5" />
            <Copy v-else class="size-3.5" />
            {{ copied ? '已复制' : '复制原文' }}
          </Button>
          <SaveButton content-type="article" :content-id="id" />
        </div>

        <ArticleAdminNote :note="data.admin_note" />

        <article ref="contentRef" class="lg-content mt-6 [&_h1,&_h2,&_h3,&_h4,&_h5,&_h6]:scroll-mt-6" v-html="html" />
        <p v-if="!selected?.content_md" class="mt-4 text-[13px] text-muted-foreground">此版本正文为空</p>
      </div>

      <!-- 目录（右侧 sticky） -->
      <div class="min-w-0 lg:col-start-3 lg:row-span-2">
        <DocumentToc :content="contentRef" />
      </div>
    </div>
  </div>
</template>
