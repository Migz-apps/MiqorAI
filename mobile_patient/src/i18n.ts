import { useCallback } from 'react'

import { translateFor, type LanguageCode, type TranslateParams } from './locales'
import { usePatientStore } from './store'

export { translations } from './locales'

// Subscribes to the persisted language, so changing it in the picker re-renders
// every screen that uses this hook immediately.
export const useTranslation = () => {
  const language: LanguageCode = usePatientStore((state) => state.language) || 'en'
  const t = useCallback(
    (path: string, params?: TranslateParams) => translateFor(language, path, params),
    [language],
  )
  return { t, language }
}

// For code outside components (alerts, toasts built in callbacks after awaits).
export function translate(path: string, params?: TranslateParams) {
  return translateFor(usePatientStore.getState().language || 'en', path, params)
}
