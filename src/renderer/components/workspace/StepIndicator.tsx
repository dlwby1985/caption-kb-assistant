import React from 'react'
import type { WorkspaceStep } from '../../types'
import { useI18n } from '../../i18n'

interface StepIndicatorProps {
  currentStep: WorkspaceStep
  onStepChange: (step: WorkspaceStep) => void
  completedSteps: Set<WorkspaceStep>
}

export default function StepIndicator({ currentStep, onStepChange, completedSteps }: StepIndicatorProps) {
  const { t } = useI18n()

  const steps: Array<{ id: WorkspaceStep; labelKey: Parameters<typeof t>[0]; num: number }> = [
    { id: 'import',    labelKey: 'step.import',    num: 1 },
    { id: 'extract',   labelKey: 'step.extract',   num: 2 },
    { id: 'knowledge', labelKey: 'step.knowledge', num: 3 },
    { id: 'correct',   labelKey: 'step.correct',   num: 4 },
    { id: 'merge',     labelKey: 'step.merge',     num: 5 },
    { id: 'export',    labelKey: 'step.export',     num: 6 },
  ]

  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {steps.map((step, i) => {
        const isActive = currentStep === step.id
        const isCompleted = completedSteps.has(step.id)
        const dotClass = isActive ? 'active' : isCompleted ? 'completed' : 'pending'

        return (
          <React.Fragment key={step.id}>
            {i > 0 && <div className={`step-line ${isCompleted ? 'completed' : ''}`} />}
            <button
              onClick={() => onStepChange(step.id)}
              className="flex items-center gap-2 group"
              title={t(step.labelKey)}
            >
              <div className={`step-dot ${dotClass}`}>
                {isCompleted ? '✓' : step.num}
              </div>
              <span className={`text-xs font-medium ${
                isActive ? 'text-white' : 'text-white/30 group-hover:text-white/50'
              }`}>
                {t(step.labelKey)}
              </span>
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}
