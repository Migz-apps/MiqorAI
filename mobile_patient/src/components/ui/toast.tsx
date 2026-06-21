import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, radius, spacing } from '../../theme'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

type ToastItem = { id: number; message: string; tone: ToastTone }

const TONE_STYLES: Record<
  ToastTone,
  { border: string; background: string; text: string; icon: typeof CheckCircle2 }
> = {
  success: {
    border: 'rgba(22, 163, 74, 0.28)',
    background: 'rgba(22, 163, 74, 0.08)',
    text: colors.success,
    icon: CheckCircle2,
  },
  error: {
    border: 'rgba(220, 38, 38, 0.28)',
    background: 'rgba(220, 38, 38, 0.08)',
    text: colors.error,
    icon: AlertCircle,
  },
  info: {
    border: 'rgba(37, 99, 235, 0.22)',
    background: 'rgba(37, 99, 235, 0.08)',
    text: colors.info,
    icon: Info,
  },
  warning: {
    border: 'rgba(180, 83, 9, 0.28)',
    background: 'rgba(180, 83, 9, 0.08)',
    text: colors.secondary,
    icon: AlertTriangle,
  },
}

const Ctx = createContext<{
  showToast: (message: string, tone?: ToastTone) => void
} | null>(null)

const TECHNICAL =
  /(\b(401|403|404|500|502|503)\b|stack|syntaxerror|typeerror|referenceerror|unhandled|rejection|fetch failed|network error|econnrefused|cors|json\.parse|undefined|null is not|sql|postgres|mongodb|firebase|supabase|axios|exception|internal server)/i

function toUserMessage(input: string) {
  const trimmed = input.trim()
  if (!trimmed || TECHNICAL.test(trimmed) || trimmed.length > 160) {
    return 'Something went wrong. Please try again.'
  }
  return trimmed
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random()
    const safe = toUserMessage(message)
    setItems((prev) => [...prev, { id, message: safe, tone }])
    setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 4000)
  }, [])

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <View
        pointerEvents="box-none"
        style={[styles.host, { bottom: insets.bottom + spacing.lg }]}
        accessibilityLiveRegion="polite"
      >
        {items.map((item) => {
          const tone = TONE_STYLES[item.tone]
          const Icon = tone.icon
          return (
            <View
              key={item.id}
              style={[
                styles.toast,
                { borderColor: tone.border, backgroundColor: tone.background },
              ]}
            >
              <Icon color={tone.text} size={18} />
              <Text style={[styles.message, { color: colors.textPrimary }]}>{item.message}</Text>
              <Pressable
                accessibilityLabel="Dismiss"
                onPress={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                hitSlop={8}
              >
                <X color={colors.textSecondary} size={16} />
              </Pressable>
            </View>
          )
        })}
      </View>
    </Ctx.Provider>
  )
}

export function useAppToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppToast must be used within ToastProvider')
  return ctx
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
})
