import { format as formatWithLocale, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'

import { translateFor } from './locales'
import { usePatientStore } from './store'

// date-fns ships no Kinyarwanda locale, so rw uses numeric day/month/year
// formats instead of English month names.
const NUMERIC_PATTERNS: Record<string, string> = {
  'MMM d, yyyy': 'dd/MM/yyyy',
  'MMMM d, yyyy': 'dd/MM/yyyy',
  'MMM d, h:mm a': 'dd/MM, HH:mm',
  'MMM d': 'dd/MM',
}

const FRENCH_PATTERNS: Record<string, string> = {
  'MMM d, yyyy': 'd MMM yyyy',
  'MMMM d, yyyy': 'd MMMM yyyy',
  'MMM d, h:mm a': 'd MMM, HH:mm',
  'MMM d': 'd MMM',
}

const currentLanguage = () => usePatientStore.getState().language || 'en'

function format(date: Date, pattern: string) {
  const language = currentLanguage()
  if (language === 'rw') {
    return formatWithLocale(date, NUMERIC_PATTERNS[pattern] ?? pattern)
  }
  if (language === 'fr') {
    return formatWithLocale(date, FRENCH_PATTERNS[pattern] ?? pattern, { locale: fr })
  }
  return formatWithLocale(date, pattern, { locale: enUS })
}

export const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const formatShortDate = (value: string) => {
  try {
    return format(parseISO(value), 'MMM d, yyyy')
  } catch {
    return value
  }
}

export const formatDate = (value: string) => {
  try {
    return format(parseISO(value), 'MMMM d, yyyy')
  } catch {
    return value
  }
}

export const formatDateTime = (value: string) => {
  try {
    return format(parseISO(value), 'MMM d, h:mm a')
  } catch {
    return value
  }
}

export const formatDistanceText = (value: string) => {
  try {
    const language = currentLanguage()
    if (language === 'rw') {
      return format(parseISO(value), 'MMM d, h:mm a')
    }
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true, locale: language === 'fr' ? fr : enUS })
  } catch {
    return value
  }
}

export const getAppointmentLabel = (value: string) => {
  try {
    const date = parseISO(value)
    if (isToday(date)) {
      return translateFor(currentLanguage(), 'dates.today')
    }
    if (isTomorrow(date)) {
      return translateFor(currentLanguage(), 'dates.tomorrow')
    }
    return format(date, 'MMM d')
  } catch {
    return ''
  }
}
