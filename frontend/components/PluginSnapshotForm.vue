<script setup lang="ts">
import type { PluginSnapshot, PluginTag } from '~/types/plugin'
import { PLUGIN_CODE_COPY_MAX_BYTES } from '~/utils/pluginCode'

const model = defineModel<PluginSnapshot>({ required: true })
const props = defineProps<{ tags: PluginTag[] }>()

const codeBytes = computed(() => new TextEncoder().encode(model.value.code || '').length)
const codeTooLarge = computed(() => codeBytes.value > 5 * 1024 * 1024)
const copyRestricted = computed(() => codeBytes.value > PLUGIN_CODE_COPY_MAX_BYTES)
const codeSizeText = computed(() => {
  if (codeBytes.value < 1024) return `${codeBytes.value} B`
  if (codeBytes.value < 1024 * 1024) return `${(codeBytes.value / 1024).toFixed(1)} KiB`
  return `${(codeBytes.value / 1024 / 1024).toFixed(2)} MiB`
})

// 等级 0-3 对应绿 / 明亮绿 / 黄 / 红，滑块与容器共用同一个变量
const LEVEL_COLOR: Record<number, string> = {
  0: 'var(--lg-green)',
  1: 'var(--lg-cyan)',
  2: 'var(--lg-yellow)',
  3: 'var(--lg-red)',
}
const levelModel = computed({
  get: () => [model.value.user_request_level],
  set: (value: number[]) => { model.value.user_request_level = value?.[0] ?? 0 },
})

function toggleTag(tagId: number, checked: boolean) {
  const values = new Set(model.value.tag_ids)
  checked ? values.add(tagId) : values.delete(tagId)
  model.value.tag_ids = [...values]
}
</script>

<template>
  <div class="space-y-8">
    <section class="space-y-4">
      <h2 class="text-base font-semibold text-foreground">基本信息</h2>

      <div class="space-y-1.5">
        <Label class="text-sm font-normal text-muted-foreground">简短介绍（可选）</Label>
        <Textarea
          v-model.trim="model.summary"
          maxlength="50"
          rows="3"
          placeholder="留空时从文章正文中自动生成"
        />
      </div>

      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">功能标签（可不选）</legend>
        <div class="flex flex-wrap gap-x-4 gap-y-2">
          <label
            v-for="tag in props.tags"
            :key="tag.id"
            class="flex cursor-pointer items-center gap-2 text-sm"
          >
            <Checkbox
              :model-value="model.tag_ids.includes(tag.id)"
              @update:model-value="(checked: boolean) => toggleTag(tag.id, checked)"
            />
            <span>{{ tag.name }}</span>
          </label>
        </div>
      </fieldset>
    </section>

    <section class="space-y-4 border-t border-border pt-6">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-base font-semibold text-foreground">代码</h2>
        <span class="text-xs tabular-nums" :class="codeTooLarge ? 'text-destructive' : 'text-muted-foreground'">
          {{ codeSizeText }} / 5 MiB
        </span>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label class="text-sm font-normal text-muted-foreground">代码版本</Label>
          <Input v-model.trim="model.version" maxlength="64" placeholder="例如 1.0.0" required />
        </div>
        <div class="space-y-1.5">
          <Label class="text-sm font-normal text-muted-foreground">下载文件名</Label>
          <Input
            v-model.trim="model.download_filename"
            maxlength="128"
            placeholder="plugin.user.js"
            required
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <Label class="text-sm font-normal text-muted-foreground">代码内容</Label>
        <Textarea
          v-model="model.code"
          rows="18"
          spellcheck="false"
          required
          class="font-mono text-[13px] leading-relaxed"
        />
      </div>

      <Alert v-if="copyRestricted" variant="destructive">
        <AlertTitle>公开页面将禁用复制</AlertTitle>
        <AlertDescription>完整代码超过 100 KiB，发布后只允许下载文件。</AlertDescription>
      </Alert>
    </section>

    <section class="space-y-4 border-t border-border pt-6">
      <h2 class="text-base font-semibold text-foreground">运行与兼容</h2>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label class="text-sm font-normal text-muted-foreground">运行方式</Label>
          <Select v-model="model.runtime_mode">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="userscript">用户脚本</SelectItem>
              <SelectItem value="extension">浏览器扩展</SelectItem>
              <SelectItem value="bookmarklet">书签脚本</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label class="text-sm font-normal text-muted-foreground">最后验证日期</Label>
          <Input v-model="model.last_verified_on" type="date" required />
        </div>
      </div>

      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">兼容设备</legend>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox v-model="model.supports_desktop" />
            <span>桌面端</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox v-model="model.supports_mobile" />
            <span>移动端</span>
          </label>
        </div>
      </fieldset>
    </section>

    <section class="space-y-4 border-t border-border pt-6">
      <h2 class="text-base font-semibold text-foreground">请求说明</h2>

      <div
        class="rounded-lg border p-4"
        :style="{ borderColor: `color-mix(in srgb, ${LEVEL_COLOR[model.user_request_level]} 45%, var(--border))`, background: `color-mix(in srgb, ${LEVEL_COLOR[model.user_request_level]} 7%, var(--background))` }"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">用户提交的请求等级</span>
          <PluginRequestLevelBadge :level="model.user_request_level" />
        </div>
        <Slider
          v-model="levelModel"
          :min="0"
          :max="3"
          :step="1"
          class="mt-3 [&_[data-slot=slider-range]]:bg-[var(--level-color)] [&_[data-slot=slider-thumb]]:border-[var(--level-color)]"
          :style="{ '--level-color': LEVEL_COLOR[model.user_request_level] }"
          aria-label="用户提交的请求等级"
        />
        <div class="mt-1.5 flex justify-between px-0.5 text-[11px] text-muted-foreground" aria-hidden="true">
          <span>0</span><span>1</span><span>2</span><span>3</span>
        </div>
      </div>

      <p class="text-[13px] leading-relaxed text-muted-foreground">
        建议说明访问的域名或接口、触发方式、单次请求数量、周期刷新或并发行为，以及是否读取 Cookie、Token、localStorage 或向第三方发送数据。
      </p>

      <PluginMarkdownEditor
        v-model="model.user_request_analysis"
        label="上传者请求分析"
        :maxlength="20000"
        placeholder="使用 Markdown 描述插件的网络请求行为"
      />
    </section>
  </div>
</template>
