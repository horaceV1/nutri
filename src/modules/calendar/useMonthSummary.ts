import { computed, ref, watch, type Ref } from 'vue'
import { endOfMonth, startOfMonth, type CalendarDate } from '@internationalized/date'
import { useNotify } from '../core/useNotify'
import { getCalendar } from './api'
import type { DaySummary } from '../../../shared/types'

/** Per-day totals for the month containing `month`, keyed by ISO date. */
export function useMonthSummary(month: Ref<CalendarDate>) {
  const notify = useNotify()
  const days = ref(new Map<string, DaySummary>())
  const loading = ref(false)

  const range = computed(() => ({
    from: startOfMonth(month.value).toString(),
    to: endOfMonth(month.value).toString()
  }))

  async function load() {
    loading.value = true
    try {
      const list = await getCalendar(range.value.from, range.value.to)
      days.value = new Map(list.map(day => [day.date, day]))
    } catch (error) {
      notify.error(error, 'Could not load calendar')
    } finally {
      loading.value = false
    }
  }

  watch(() => range.value.from, load, { immediate: true })

  return { days, loading, range, reload: load }
}
