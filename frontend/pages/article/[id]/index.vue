<script setup lang="ts">
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

const crawledAtText = computed(() =>
  data.value ? format(data.value.crawled_at) : '',
)
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
      <ContentHeader
        label="文章归档"
        :author="data.author"
        :crawled-at="crawledAtText"
        :version-count="data.version_count"
        :history-to="`/article/${id}/history`"
        :original-href="`https://www.luogu.com.cn/article/${id}`"
        :markdown="data.content_md"
        content-type="article"
        :content-id="id"
      >
        {{ data.title }}
      </ContentHeader>

      <!-- 与洛谷文章页保持一致：红色引用块 + 固定的“管理组提示：”标题。 -->
      <ArticleAdminNote :note="data.admin_note" />

      <article ref="contentRef" class="lg-content mt-6" v-html="html" />
    </template>
  </div>
</template>
