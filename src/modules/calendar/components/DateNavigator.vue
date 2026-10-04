<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalendarDate } from '@internationalized/date'
import { relativeDayLabel, shiftIso, toCalendarDate, todayIso } from '../../core/date'

const date = defineModel<string>({ required: true })
const open = ref(false)

const calendarValue = computed({
  get: () => toCalendarDate(date.value),
  set: (value: CalendarDate | undefined) => {
    if (!value) return
    date.value = value.toString()
    open.value = false
  }
})
</script>

<template>
  <UFieldGroup>
    <UButton
      icon="i-lucide-chevron-left"
      color="neutral"
      variant="outline"
      aria-label="Previous day"
      @click="date = shiftIso(date, -1)"
    />

    <UPopover v-model:open="open">
      <UButton
        icon="i-lucide-calendar"
        :label="relativeDayLabel(date)"
        color="neutral"
        variant="outline"
        class="min-w-36 justify-center"
      />
      <template #content>
        <UCalendar v-model="calendarValue" class="p-2" />
      </template>
    </UPopover>

    <UButton
      icon="i-lucide-chevron-right"
      color="neutral"
      variant="outline"
      aria-label="Next day"
      @click="date = shiftIso(date, 1)"
    />

    <UButton
      v-if="date !== todayIso()"
      label="Today"
      color="neutral"
      variant="outline"
      @click="date = todayIso()"
    />
  </UFieldGroup>
</template>
