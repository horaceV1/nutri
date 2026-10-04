<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAuth } from '../modules/auth/useAuth'
import AppLogo from '../modules/core/components/AppLogo.vue'

const router = useRouter()
const { isAdmin } = useAuth()

const open = ref(false)
const close = () => {
  open.value = false
}

const links = computed(() => {
  const main: NavigationMenuItem[] = [{
    label: 'Diary',
    icon: 'i-lucide-notebook-pen',
    to: '/',
    onSelect: close
  }, {
    label: 'Calendar',
    icon: 'i-lucide-calendar-days',
    to: '/calendar',
    onSelect: close
  }, {
    label: 'Notes',
    icon: 'i-lucide-sticky-note',
    to: '/notes',
    onSelect: close
  }]

  if (isAdmin.value) {
    main.push({
      label: 'Users',
      icon: 'i-lucide-users',
      to: '/admin/users',
      badge: 'Admin',
      onSelect: close
    })
  }

  main.push({
    label: 'Settings',
    to: '/settings',
    icon: 'i-lucide-settings',
    defaultOpen: true,
    type: 'trigger',
    children: [{
      label: 'General',
      to: '/settings',
      exact: true,
      onSelect: close
    }, {
      label: 'Security',
      to: '/settings/security',
      onSelect: close
    }]
  })

  const secondary: NavigationMenuItem[] = [{
    label: 'Food data: USDA FoodData Central',
    icon: 'i-lucide-database',
    to: 'https://fdc.nal.usda.gov/',
    target: '_blank'
  }]

  return [main, secondary]
})

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.value[0]!
    .flatMap(link => link.children?.map(child => ({ ...child, icon: link.icon })) ?? [link])
    .map(({ label, icon, to }) => ({ id: String(to), label, icon, to }))
}])

defineShortcuts({
  'g-d': () => router.push('/'),
  'g-c': () => router.push('/calendar'),
  'g-n': () => router.push('/notes'),
  'g-s': () => router.push('/settings')
})
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <AppLogo :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <RouterView />
  </UDashboardGroup>
</template>
