'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OnboardingStep = 'name' | 'medication' | 'schedule' | 'confirm'

type OnboardingState = {
  displayName: string
  step: OnboardingStep
  setDisplayName: (displayName: string) => void
  setStep: (step: OnboardingStep) => void
  advance: () => void
  reset: () => void
}

const steps: OnboardingStep[] = ['name', 'medication', 'schedule', 'confirm']
const initialState = { displayName: '', step: 'name' as OnboardingStep }

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setDisplayName: (displayName) => set({ displayName }),
      setStep: (step) => set({ step }),
      advance: () =>
        set((state) => {
          const index = steps.indexOf(state.step)
          return { step: steps[Math.min(index + 1, steps.length - 1)] }
        }),
      reset: () => set(initialState),
    }),
    { name: 'remindmeds-onboarding' },
  ),
)
