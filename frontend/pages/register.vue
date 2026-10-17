<script setup lang="ts">
import { CircleCheck } from '@lucide/vue'

const form = ref({ email: '', password: '', display_name: '' })
const passwordConfirm = ref('')
const state = ref<'idle' | 'loading' | 'done'>('idle')
const err = ref('')
const captchaRef = ref<any>(null)

const api = useApi()

async function submit() {
  err.value = ''
  if (form.value.password !== passwordConfirm.value) {
    err.value = '两次输入的密码不一致'
    return
  }
  state.value = 'loading'
  try {
    const captchaToken = await captchaRef.value?.getToken?.()
    await api('/auth/register', {
      method: 'POST',
      body: {
        ...form.value,
        captcha_token: captchaToken || undefined,
      },
    })
    state.value = 'done'
  } catch (e: any) {
    err.value = e?.data?.message || '注册失败'
    captchaRef.value?.reset?.()
    state.value = 'idle'
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[400px] py-10 sm:py-14">
    <div class="mb-6 text-center">
      <img src="/favicon.png" alt="" class="mx-auto mb-4 size-12 rounded-xl">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">
        注册
      </h1>
      <p class="mt-1.5 text-sm text-muted-foreground">
        注册后可以关注内容、追踪版本变化
      </p>
    </div>

    <Card class="gap-0 py-0">
      <CardContent class="p-6">
        <form v-if="state !== 'done'" class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="grid gap-2">
            <Label for="reg-email">邮箱</Label>
            <Input
              id="reg-email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div class="grid gap-2">
            <Label for="reg-name">显示名</Label>
            <Input
              id="reg-name"
              v-model="form.display_name"
              type="text"
              minlength="1"
              maxlength="16"
              placeholder="1-16 个字符"
              required
            />
          </div>

          <div class="grid gap-2">
            <Label for="reg-password">密码</Label>
            <Input
              id="reg-password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              minlength="8"
              maxlength="128"
              required
            />
            <p class="text-xs text-muted-foreground">
              至少 8 位，需包含字母和数字
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="reg-password2">确认密码</Label>
            <Input
              id="reg-password2"
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              minlength="8"
              maxlength="128"
              required
            />
          </div>

          <CaptchaChallenge ref="captchaRef" id-suffix="register" />

          <Alert v-if="err" variant="destructive" class="px-3 py-2">
            <AlertDescription class="text-sm">
              {{ err }}
            </AlertDescription>
          </Alert>

          <Button type="submit" class="w-full" :disabled="state === 'loading'">
            {{ state === 'loading' ? '提交中...' : '注册' }}
          </Button>
        </form>

        <div v-else class="flex flex-col items-center py-4 text-center">
          <CircleCheck class="size-10 text-emerald-500" />
          <h2 class="mt-3 text-base font-semibold text-foreground">
            已发送验证邮件
          </h2>
          <p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            请到 {{ form.email }} 的邮箱查收，24 小时内点击验证链接即可登录。
          </p>
          <Button variant="outline" size="sm" as-child class="mt-4">
            <NuxtLink to="/login">返回登录</NuxtLink>
          </Button>
        </div>
      </CardContent>
    </Card>

    <p class="mt-6 text-center text-sm text-muted-foreground">
      已有账号？
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">
        登录
      </NuxtLink>
    </p>
  </div>
</template>
