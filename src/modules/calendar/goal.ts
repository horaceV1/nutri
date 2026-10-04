export type GoalStatus = 'empty' | 'under' | 'on-target' | 'over'

/** Within ±10 % of the goal counts as on target. */
export function goalStatus(kcal: number, goal: number): GoalStatus {
  if (!kcal) return 'empty'
  const ratio = kcal / goal
  if (ratio > 1.1) return 'over'
  if (ratio >= 0.9) return 'on-target'
  return 'under'
}

export const GOAL_STATUS_STYLE: Record<GoalStatus, { label: string, dot: string, bar: string, text: string }> = {
  'empty': { label: 'Nothing logged', dot: 'bg-accented', bar: 'bg-accented', text: 'text-dimmed' },
  'under': { label: 'Under goal', dot: 'bg-sky-500', bar: 'bg-sky-500', text: 'text-sky-500' },
  'on-target': { label: 'On target (±10 %)', dot: 'bg-primary', bar: 'bg-primary', text: 'text-primary' },
  'over': { label: 'Over goal', dot: 'bg-error', bar: 'bg-error', text: 'text-error' }
}
