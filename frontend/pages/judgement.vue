<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

const { smart } = useTime()

const api = useApi()

interface UserBrief {
  uid: number
  name: string
  color: string
  badge: string | null
  avatar: string | null
}
interface JudgementGroup {
  group_key: string
  reason: string
  revoked_permission: number
  added_permission: number
  time_start: string
  time_end: string
  users: UserBrief[]
  count: number
}

const PAGE_SIZE = 50

const groups = ref<JudgementGroup[]>([])
const loading = ref(false)
const noMore = ref(false)
// 游标：取下一页时把这个值塞 ?before=
const beforeTs = ref<string | null>(null)

// 首屏不等待后端：先显示页面，再拉第一页陶片。
const { data: firstPage, pending: firstPending } = useLazyAsyncData('judgement-first', () =>
  api<JudgementGroup[]>('/judgement', { query: { limit: PAGE_SIZE } }),
  { server: false },
)
const { data: lastCrawled } = useLazyAsyncData('judgement-last-crawled', () =>
  api<{ last_crawled_at: string | null }>('/last-crawled?type=judgement'),
  { server: false },
)

watch(firstPage, (page) => {
  if (!page) return
  groups.value = [...page]
  // 用 time_end 倒序拿下一页：取最后一组的 time_start 当游标。
  // 注意：不能用 length < PAGE_SIZE 判 noMore，后端先拉原始记录再合并分组。
  beforeTs.value = page.length ? page[page.length - 1].time_start : null
  noMore.value = page.length === 0
}, { immediate: true })

async function loadMore() {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const q: Record<string, any> = { limit: PAGE_SIZE }
    if (beforeTs.value) q.before = beforeTs.value
    const page = await api<JudgementGroup[]>('/judgement', { query: q })
    if (page.length === 0) {
      noMore.value = true
    } else {
      // 去重：分页边界上同一条 judgement 可能在两页都被合并出来
      const seen = new Set(groups.value.map(g => g.group_key))
      const fresh = page.filter(g => !seen.has(g.group_key))
      groups.value.push(...fresh)
      beforeTs.value = page[page.length - 1].time_start
      // 同首屏，只有空页才判 noMore；group 数小于 PAGE_SIZE 是合并后的常态
    }
  } finally {
    loading.value = false
  }
}

/**
 * 洛谷权限位图。多个权限组合 = 数值相加（位或）。
 * 例：98304 = 32768 (自由发言) + 65536 (发送私信)。
 * 未确认的一律显示"未知位 (X)"，实测后逐步补齐。
 */
const PERMISSION_MAP: Array<[number, string]> = [
  [1, '登录授权'],
  [2, '进入主站'],
  [4, '进入后台'],
  [8, '题目管理'],
  [16, '团队管理'],
  [32, '比赛管理'],
  [64, '讨论管理'],
  [256, '用户管理'],
  [512, '专栏管理'],
  [32768, '自由发言'],
  [65536, '发送私信'],
  [131072, '使用专栏'],
  [524288, '使用图床'],
  [2097152, '题目志愿者'],
  [4194304, '专栏志愿者'],
]

function describePermission(bits: number): string[] {
  if (!bits) return []
  const out: string[] = []
  let remaining = bits
  for (const [v, label] of PERMISSION_MAP) {
    if ((bits & v) === v) {
      out.push(label)
      remaining &= ~v
    }
  }
  if (remaining) out.push(`未知位 (${remaining})`)
  return out
}

function actionTag(g: JudgementGroup) {
  if (g.revoked_permission > 0 && g.added_permission === 0) return { text: '撤销权限', cls: 'text-[var(--lg-red)]' }
  if (g.added_permission > 0 && g.revoked_permission === 0) return { text: '授予权限', cls: 'text-[var(--lg-green)]' }
  if (g.revoked_permission === 0 && g.added_permission === 0) return { text: '棕名惩罚', cls: 'text-[var(--lg-cheater-tag)]' }
  return { text: '权限变更', cls: 'text-muted-foreground' }
}
</script>

<template>
  <div>
    <!-- 页面头：裸排 + border-b -->
    <header class="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div class="min-w-0">
        <p class="text-xs font-medium tracking-wide text-muted-foreground">封禁公示归档</p>
        <h1 class="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">陶片放逐</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="lastCrawled?.last_crawled_at"
          class="text-xs text-muted-foreground"
        >上次更新 · {{ smart(lastCrawled.last_crawled_at) }}</span>
        <Button variant="outline" size="sm" as-child>
          <a href="https://www.luogu.com.cn/judgement" target="_blank" rel="noopener noreferrer">
            <ExternalLink class="size-3.5" />
            查看原文
          </a>
        </Button>
        <SaveButton content-type="judgement" content-id="all" />
      </div>
    </header>

    <!-- 首屏骨架：与陶片卡同构 -->
    <div v-if="firstPending && !groups.length" class="mt-5 space-y-3.5">
      <div v-for="i in 5" :key="i" class="space-y-3 rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2.5">
          <Skeleton class="h-5 w-20" />
          <Skeleton class="ml-auto h-3.5 w-24" />
        </div>
        <div class="flex gap-2.5">
          <Skeleton class="size-10 rounded-full" />
          <Skeleton class="h-5 w-28 self-center" />
        </div>
        <Skeleton class="h-4 w-full max-w-[70%]" />
      </div>
    </div>

    <ul v-else-if="groups.length" class="mt-5 list-none space-y-3.5">
      <li
        v-for="g in groups"
        :key="g.group_key"
        class="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <!-- 顶部：权限变更头标 + 人数 + 时间 -->
        <header class="flex flex-wrap items-center gap-2.5 text-sm">
          <span class="text-[13px] font-semibold" :class="actionTag(g).cls">{{ actionTag(g).text }}</span>
          <span
            v-if="g.count > 1"
            class="rounded-full bg-[var(--lg-orange)] px-2 py-px text-xs font-semibold text-white"
          >{{ g.count }} 人</span>
          <span class="ml-auto text-[13px] tabular-nums text-muted-foreground">{{ smart(g.time_end) }}</span>
        </header>

        <!-- 中间：用户（头像 + 名字） -->
        <div class="flex flex-wrap gap-2.5">
          <NuxtLink
            v-for="u in g.users"
            :key="u.uid"
            :to="`/user/${u.uid}`"
            class="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-accent"
          >
            <UserAvatar :user="u" size="lg" />
            <span class="text-base font-semibold"><LuoguUserName :user="u" show-badge no-link /></span>
          </NuxtLink>
        </div>

        <!-- 下部：权限明细 -->
        <div class="space-y-1 pl-2">
          <div v-if="describePermission(g.revoked_permission).length" class="flex flex-wrap items-center gap-1.5 text-sm">
            <span class="font-medium text-[var(--lg-red)]">● 撤销</span>
            <span
              v-for="p in describePermission(g.revoked_permission)"
              :key="`r-${p}`"
              class="rounded border border-border bg-muted px-2.5 py-0.5 text-[13px]"
            >{{ p }}</span>
            <span class="text-[13px] text-muted-foreground">权限</span>
          </div>
          <div v-if="describePermission(g.added_permission).length" class="flex flex-wrap items-center gap-1.5 text-sm">
            <span class="font-medium text-[var(--lg-green)]">● 授予</span>
            <span
              v-for="p in describePermission(g.added_permission)"
              :key="`a-${p}`"
              class="rounded border border-border bg-muted px-2.5 py-0.5 text-[13px]"
            >{{ p }}</span>
            <span class="text-[13px] text-muted-foreground">权限</span>
          </div>
        </div>

        <!-- 最底：原因 -->
        <p class="border-t border-dashed border-border pt-2.5 text-sm text-foreground">{{ g.reason }}</p>
      </li>
    </ul>

    <p
      v-else
      class="mt-5 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
    >暂无数据</p>

    <!-- 加载更多 -->
    <div v-if="groups.length" class="mt-5 text-center">
      <Button v-if="!noMore" variant="outline" :disabled="loading" @click="loadMore">
        {{ loading ? '加载中…' : '加载更多' }}
      </Button>
      <span v-else class="text-sm text-muted-foreground">没有更多了</span>
    </div>
  </div>
</template>
