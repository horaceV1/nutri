<script setup lang="ts">
import { computed } from 'vue'
import { getLocalTimeZone, isSameMonth, startOfMonth, startOfWeek, type CalendarDate } from '@internationalized/date'
import { todayIso } from '../../core/date'
import { GOAL_STATUS_STYLE, goalStatus } from '../goal'
import type { DaySummary } from '../../../../shared/types'

const props = defineProps<{
  days: Map<string, DaySummary>
  goal: number
  selected?: string
}>()

const month = defineModel<CalendarDate>('month', { required: true })

const emit = defineEmits<{
  select: [date: string]
}>()

const locale = navigator.language
const timeZone = getLocalTimeZone()

const title = computed(() => {
  const label = month.value.toDate(timeZone).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
})

// Always 6 weeks so the grid height doesn't jump between months.
const cells = computed(() => {
  const first = startOfWeek(startOfMonth(month.value), locale)
  return Array.from({ length: 42 }, (_, i) => {
    const date = first.add({ days: i })
    const iso = date.toString()
    const summary = props.days.get(iso)
    const status = goalStatus(summary?.kcal ?? 0, props.goal)
    return {
      iso,
      day: date.day,
      inMonth: isSameMonth(date, month.value),
      isToday: iso === todayIso(),
      summary,
      style: GOAL_STATUS_STYLE[status],
      fill: Math.min(100, ((summary?.kcal ?? 0) / props.goal) * 100)
    }
  })
})

const weekdays = computed(() => cells.value.slice(0, 7).map(cell =>
  new Date(`${cell.iso}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })
))

const shift = (months: number) => {
  month.value = month.value.add({ months })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-lg font-semibold text-highlighted">
        {{ title }}
      </h2>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          aria-label="Previous month"
          @click="shift(-1)"
        />
        <UButton
          label="Today"
          color="neutral"
          variant="outline"
          size="sm"
          @click="emit('select', todayIso())"
        />
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          aria-label="Next month"
          @click="shift(1)"
        />
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
      <div
        v-for="weekday in weekdays"
        :key="weekday"
        class="pb-1 text-center text-xs font-medium uppercase text-muted"
      >
        {{ weekday }}
      </div>

      <button
        v-for="cell in cells"
        :key="cell.iso"
        type="button"
        class="group relative flex min-h-16 flex-col gap-1 rounded-md border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2"
        :class="[
          cell.iso === selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default hover:bg-elevated/60',
          !cell.inMonth && 'opacity-40'
        ]"
        :aria-label="cell.iso"
        @click="emit('select', cell.iso)"
      >
        <div class="flex items-center justify-between">
          <span
            class="inline-flex size-6 items-center justify-center rounded-full text-xs font-medium"
            :class="cell.isToday ? 'bg-primary text-inverted' : 'text-highlighted'"
          >
            {{ cell.day }}
          </span>
          <UIcon
            v-if="cell.summary?.notes"
            name="i-lucide-sticky-note"
            class="size-3.5 text-warning"
          />
        </div>

        <template v-if="cell.summary?.kcal">
          <span class="mt-auto truncate text-xs font-semibold tabular-nums" :class="cell.style.text">
            {{ cell.summary.kcal }}<span class="hidden sm:inline"> kcal</span>
          </span>
          <span class="h-1 w-full overflow-hidden rounded-full bg-elevated">
            <span class="block h-full rounded-full" :class="cell.style.bar" :style="{ width: `${cell.fill}%` }" />
          </span>
        </template>
      </button>
    </div>
  </div>
</template>
