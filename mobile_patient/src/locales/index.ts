import { appStrings } from './app'
import { authStrings } from './auth'
import { baseStrings } from './base'
import { familyStrings } from './family'
import { homeStrings } from './home'
import { legalStrings } from './legal'
import { onboardingStrings } from './onboarding'
import { profileStrings } from './profile'
import { recordsStrings } from './records'
import { shareStrings } from './share'
import { mergeLocales, translateIn, type LanguageCode, type LocaleModule, type TranslateParams } from './translate'
import { uiStrings } from './ui'

export type { LanguageCode, TranslateParams } from './translate'
export { SUPPORTED_LANGUAGES } from './translate'

export const translations = mergeLocales([
  baseStrings as LocaleModule,
  appStrings,
  authStrings,
  familyStrings,
  homeStrings,
  legalStrings,
  onboardingStrings,
  profileStrings,
  recordsStrings,
  shareStrings,
  uiStrings,
])

export function translateFor(language: LanguageCode, path: string, params?: TranslateParams) {
  return translateIn(translations, language, path, params)
}
