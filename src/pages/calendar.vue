<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../modules/auth/useAuth'
import GoalLegend from '../modules/calendar/components/GoalLegend.vue'
import MonthGrid from '../modules/calendar/components/MonthGrid.vue'
import { goalStatus } from '../modules/calendar/goal'
import { useMonthSummary } from '../modules/calendar/useMonthSummary'
import { formatDate, toCalendarDate, todayIso } from '../modules/core/date'
import DayNotes from '../modules/notes/components/DayNotes.vue'

const router = useRouter()
const { user } = useAuth()
const goal = computed(() => user.value?.dailyGoal ?? 2000)

const selected = ref(todayIso())
const month = shallowRef(toCalendarDate(selected.value))
const { days, reload } = useMonthSummary(month)

function select(iso: string) {
  selected.value = iso
  const date = toCalendarDate(iso)
  if (date.month !== month.value.month || date.year !== month.value.year) month.value = date
}

const selectedSummary = computed(() => days.value.get(selected.value))

const stats = computed(() => {
  const logged = [...days.value.values()].filter(d => d.kcal > 0)
  const average = logged.length ? Math.round(logged.reduce((sum, d) => sum + d.kcal, 0) / logged.length) : 0
  const onTarget = logged.filter(d => goalStatus(d.kcal, goal.value) === 'on-target').length
  return [
    { title: 'Days logged', icon: 'i-lucide-calendar-check', value: logged.length },
    { title: 'Average intake', icon: 'i-lucide-flame', value: average ? `${average} kcal` : '—' },
    { title: 'Days on target', icon: 'i-lucide-target', value: onTarget }
  ]
})
</script>

<template>
  <UDashboardPanel id="calendar">
    <template #header>
      <UDashboardNavbar title="Calendar">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageGrid class="lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-px">
        <UPageCard
          v-for="stat in stats"
          :key="stat.title"
          :icon="stat.icon"
          :title="stat.title"
          variant="subtle"
          :ui="{
            container: 'gap-y-1.5',
            wrapper: 'items-start',
            leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25',
            title: 'font-normal text-muted text-xs uppercase'
          }"
          class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg"
        >
          <span class="text-2xl font-semibold text-highlighted">{{ stat.value }}</span>
        </UPageCard>
      </UPageGrid>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] items-start">
        <div class="space-y-3">
          <MonthGrid
            v-model:month="month"
            :days="days"
            :goal="goal"
            :selected="selected"
            @select="select"
          />
          <GoalLegend />
        </div>

        <aside class="space-y-6">
          <UPageCard variant="subtle" :ui="{ container: 'p-4 sm:p-5 gap-y-3' }">
            <p class="text-xs uppercase text-muted">
              {{ formatDate(selected) }}
            </p>
            <p class="text-2xl font-semibold text-highlighted tabular-nums">
              {{ selectedSummary?.kcal ?? 0 }}
              <span class="text-base font-normal text-muted">/ {{ goal }} kcal</span>
            </p>
            <p class="text-sm text-muted">
              {{ selectedSummary?.entries ?? 0 }} food {{ selectedSummary?.entries === 1 ? 'entry' : 'entries' }}
            </p>
            <UButton
              label="Open in diary"
              icon="i-lucide-notebook-pen"
              color="neutral"
              variant="outline"
              class="w-fit"
              @click="router.push({ path: '/', query: selected === todayIso() ? {} : { date: selected } })"
            />
          </UPageCard>

          <DayNotes :date="selected" @changed="reload" />
        </aside>
      </div>
    </template>
  </UDashboardPanel>
</template>
