import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from 'date-fns'

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
    return formatDistanceToNowStrict(parseISO(value), { addSuffix: true })
  } catch {
    return value
  }
}

export const getAppointmentLabel = (value: string) => {
  try {
    const date = parseISO(value)
    if (isToday(date)) {
      return 'Today'
    }
    if (isTomorrow(date)) {
      return 'Tomorrow'
    }
    return format(date, 'MMM d')
  } catch {
    return ''
  }
}
