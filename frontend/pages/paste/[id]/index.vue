<script setup lang="ts">
const { format } = useTime()

const route = useRoute()
const api = useApi()
const id = route.params.id as string

interface PasteDetail {
  paste_id: string
  content_md: string
  author: any
  crawled_at: string
  version_count: number
}

// 不阻塞页面首屏：剪贴板正文由浏览器端异步请求。
const { data, error, pending } = useLazyAsyncData(`paste-${id}`, () =>
  api<PasteDetail>(`/paste/${id}`),
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
      <Skeleton class="h-7 w-40" />
      <div class="flex items-center gap-3">
        <Skeleton class="size-8 rounded-full" />
        <Skeleton class="h-4 w-32" />
      </div>
      <div class="space-y-2.5 pt-3">
        <Skeleton v-for="i in 10" :key="i" class="h-4" :class="i % 4 === 0 ? 'w-2/3' : 'w-full'" />
      </div>
    </div>

    <Card v-else-if="error" class="gap-0 py-0">
      <CardContent class="flex flex-col items-center px-6 py-12 text-center">
        <h2 class="text-base font-semibold text-foreground">
          {{ error.data?.message || '加载失败' }}
        </h2>
        <p v-if="error.statusCode === 404" class="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          刚才已触发一次爬取，稍等片刻刷新即可。
        </p>
      </CardContent>
    </Card>

    <template v-else-if="data">
      <ContentHeader
        label="剪贴板归档"
        :author="data.author"
        :crawled-at="crawledAtText"
        :version-count="data.version_count"
        :history-to="`/paste/${id}/history`"
        :original-href="`https://www.luogu.com.cn/paste/${id}`"
        :markdown="data.content_md"
        content-type="paste"
        :content-id="id"
      >
        <span>剪贴板</span>
        <span class="ml-2 font-mono text-xl font-semibold text-muted-foreground sm:text-2xl">{{ id }}</span>
      </ContentHeader>

      <article ref="contentRef" class="lg-content mt-6" v-html="html" />
    </template>
  </div>
</template>
