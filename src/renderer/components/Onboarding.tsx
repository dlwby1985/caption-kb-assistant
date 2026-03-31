import React, { useState } from 'react'
import { useI18n } from '../i18n'

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n()
  const [step, setStep] = useState(0)

  const steps = [
    { title: t('onboarding.welcome'), body: t('onboarding.welcomeDesc'), icon: '1' },
    { title: t('onboarding.step2'), body: t('onboarding.step2Desc'), icon: '2' },
    { title: t('onboarding.step3'), body: t('onboarding.step3Desc'), icon: '3' },
    { title: t('onboarding.step4'), body: t('onboarding.step4Desc'), icon: '4' },
    { title: t('onboarding.step5'), body: t('onboarding.step5Desc'), icon: '5' },
  ]

  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="gm-panel w-[480px] p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-primary/15 flex items-center justify-center text-brand-primary text-2xl font-bold">
          {steps[step].icon}
        </div>
        <h2 className="text-xl font-semibold text-white mb-3">{steps[step].title}</h2>
        <p className="text-sm text-white/60 leading-relaxed mb-8">{steps[step].body}</p>

        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-brand-primary w-6' : i < step ? 'bg-brand-primary/40' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <button className="btn-secondary text-sm" onClick={onComplete}>
            {t('onboarding.skip')}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
          >
            {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
