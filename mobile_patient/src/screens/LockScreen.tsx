import { Lock } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PinInput, TextButton } from '../components/ui'
import { useTranslation } from '../i18n'
import { clearPin, verifyPin } from '../lib/pin'
import { useResponsive } from '../responsive'
import { usePatientStore } from '../store'
import { colors, spacing } from '../theme'

export function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const { logout, setLastUnlockTime } = usePatientStore()
  const { horizontalPadding, isCompact } = useResponsive()
  const { t } = useTranslation()

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (pin.length !== 6 || isVerifying) {
      return
    }

    let cancelled = false
    setIsVerifying(true)
    void verifyPin(pin).then((valid) => {
      if (cancelled) {
        return
      }

      setIsVerifying(false)
      if (valid) {
        setLastUnlockTime(Date.now())
        onUnlocked()
        return
      }

      setPin('')
      setError(t('lock.incorrect'))
    })

    return () => {
      cancelled = true
    }
  }, [pin, isVerifying, onUnlocked, setLastUnlockTime])

  const handleForgotPin = async () => {
    await clearPin()
    await logout().catch(() => undefined)
    onUnlocked()
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.body, { paddingHorizontal: horizontalPadding + spacing.md }]}>
        <View style={[styles.mark, isCompact ? styles.markCompact : null]}>
          <Lock color="#FFFFFF" size={36} />
        </View>
        <Text style={styles.title} accessibilityRole="header">{t('lock.title')}</Text>
        <Text style={styles.subtitle}>{t('lock.subtitle')}</Text>

        <View style={styles.pinWrap}>
          <PinInput
            value={pin}
            onChange={(value) => {
              setPin(value)
              setError('')
            }}
            error={error}
          />
        </View>

        <TextButton onPress={handleForgotPin} accessibilityHint={t('lock.forgotPinHint')}>
          {t('lock.forgotPin')}
        </TextButton>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  mark: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCompact: {
    width: 78,
    height: 78,
    borderRadius: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  pinWrap: {
    width: '100%',
    marginTop: spacing.md,
  },
})
