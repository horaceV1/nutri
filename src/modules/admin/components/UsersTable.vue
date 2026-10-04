<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { User } from '../../../../shared/types'

const props = defineProps<{
  users: User[]
  loading?: boolean
  currentUserId?: number
}>()

const emit = defineEmits<{
  edit: [user: User]
  remove: [user: User]
}>()

const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const columns: TableColumn<User>[] = [{
  accessorKey: 'name',
  header: 'User',
  cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
    h(UAvatar, { alt: row.original.name, size: 'md' }),
    h('div', { class: 'min-w-0' }, [
      h('p', { class: 'font-medium text-highlighted truncate' }, row.original.name),
      h('p', { class: 'text-muted truncate' }, row.original.email)
    ])
  ])
}, {
  accessorKey: 'role',
  header: 'Role',
  cell: ({ row }) => h(UBadge, {
    label: row.original.role,
    color: row.original.role === 'admin' ? 'primary' : 'neutral',
    variant: 'subtle',
    class: 'capitalize'
  })
}, {
  accessorKey: 'dailyGoal',
  header: 'Daily goal',
  cell: ({ row }) => `${row.original.dailyGoal} kcal`
}, {
  accessorKey: 'createdAt',
  header: 'Joined',
  cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
}, {
  id: 'actions',
  cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
    content: { align: 'end' },
    items: [
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => emit('edit', row.original) },
      ...(row.original.id === props.currentUserId
        ? []
        : [{ label: 'Delete', icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => emit('remove', row.original) }])
    ]
  }, () => h(UButton, { 'icon': 'i-lucide-ellipsis-vertical', 'color': 'neutral', 'variant': 'ghost', 'aria-label': 'User actions' })))
}]
</script>

<template>
  <UTable
    :data="users"
    :columns="columns"
    :loading="loading"
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default',
      separator: 'h-0'
    }"
  />
</template>
