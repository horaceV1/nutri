<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../modules/auth/useAuth'
import DateNavigator from '../modules/calendar/components/DateNavigator.vue'
import { isIsoDate, todayIso } from '../modules/core/date'
import AddFoodModal from '../modules/diary/components/AddFoodModal.vue'
import DayTotals from '../modules/diary/components/DayTotals.vue'
import MealSection from '../modules/diary/components/MealSection.vue'
import { mealForNow } from '../modules/diary/meals'
import { useDiaryDay } from '../modules/diary/useDiaryDay'
import DayNotes from '../modules/notes/components/DayNotes.vue'
import type { Meal } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

// The selected day lives in the URL so it survives reloads and can be linked from the calendar.
const date = computed({
  get: () => isIsoDate(route.query.date) ? route.query.date : todayIso(),
  set: (value: string) => {
    void router.replace({ query: value === todayIso() ? {} : { date: value } })
  }
})

const { meals, totals, loading, add, setGrams, setMeal, remove } = useDiaryDay(date)

const addOpen = ref(false)
const addMeal = ref<Meal>(mealForNow())

function openAdd(meal: Meal = mealForNow()) {
  addMeal.value = meal
  addOpen.value = true
}

defineShortcuts({
  a: () => openAdd()
})
</script>

<template>
  <UDashboardPanel id="diary">
    <template #header>
      <UDashboardNavbar title="Diary">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" label="Add food" @click="openAdd()">
            <template #trailing>
              <UKbd value="A" class="hidden sm:inline-flex" />
            </template>
          </UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <DateNavigator v-model="date" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
        <div class="space-y-4">
          <template v-if="loading && !meals.some(m => m.entries.length)">
            <USkeleton v-for="i in 4" :key="i" class="h-28 w-full" />
          </template>
          <template v-else>
            <MealSection
              v-for="section in meals"
              :key="section.meal"
              v-bind="section"
              @add="openAdd(section.meal)"
              @update:grams="setGrams"
              @move="setMeal"
              @remove="remove"
            />
          </template>
        </div>

        <aside class="space-y-6 lg:sticky lg:top-0">
          <DayTotals :totals="totals" :goal="user?.dailyGoal ?? 2000" />
          <DayNotes :date="date" />
        </aside>
      </div>

      <AddFoodModal
        v-model:open="addOpen"
        :date="date"
        :meal="addMeal"
        :on-save="add"
      />
    </template>
  </UDashboardPanel>
</template>
