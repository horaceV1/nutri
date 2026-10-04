<route lang="json">
{ "meta": { "admin": true } }
</route>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createUser, deleteUser, listUsers, updateUser, type UserInput } from '../../modules/admin/api'
import UserFormModal from '../../modules/admin/components/UserFormModal.vue'
import UsersTable from '../../modules/admin/components/UsersTable.vue'
import { useAuth } from '../../modules/auth/useAuth'
import ConfirmModal from '../../modules/core/components/ConfirmModal.vue'
import { useNotify } from '../../modules/core/useNotify'
import type { User } from '../../../shared/types'

const auth = useAuth()
const notify = useNotify()

const users = ref<User[]>([])
const loading = ref(false)
const search = ref('')

async function load() {
  loading.value = true
  try {
    users.value = await listUsers()
  } catch (error) {
    notify.error(error, 'Could not load users')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return term ? users.value.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) : users.value
})

const formOpen = ref(false)
const editing = ref<User | null>(null)
const deleting = ref<User | null>(null)

function openForm(user: User | null = null) {
  editing.value = user
  formOpen.value = true
}

async function save(input: UserInput, id?: number) {
  const saved = id ? await updateUser(id, input) : await createUser(input as Required<UserInput>)
  users.value = id ? users.value.map(u => u.id === id ? saved : u) : [...users.value, saved]
  if (saved.id === auth.user.value?.id) auth.setUser(saved)
}

async function onDelete() {
  if (!deleting.value) return
  try {
    await deleteUser(deleting.value.id)
    users.value = users.value.filter(u => u.id !== deleting.value!.id)
    notify.success('User deleted')
    deleting.value = null
  } catch (error) {
    notify.error(error, 'Could not delete user')
  }
}
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-user-plus" label="New user" @click="openForm()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Filter by name or email…"
        class="max-w-sm"
      />

      <UsersTable
        :users="filtered"
        :loading="loading"
        :current-user-id="auth.user.value?.id"
        @edit="openForm"
        @remove="user => deleting = user"
      />

      <UserFormModal v-model:open="formOpen" :user="editing" :on-save="save" />

      <ConfirmModal
        :open="!!deleting"
        title="Delete user?"
        :description="deleting ? `${deleting.name} (${deleting.email}) and all of their diary entries and notes will be permanently deleted.` : undefined"
        :on-confirm="onDelete"
        @update:open="value => { if (!value) deleting = null }"
      />
    </template>
  </UDashboardPanel>
</template>
