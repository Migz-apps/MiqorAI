import { Maximize2, RefreshCw, Share2, Wifi, WifiOff } from 'lucide-react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { useTranslation } from '../../i18n'
import { qrRefreshMarginMs, shouldAutoRefresh } from '../../lib/backoff'
import { useResponsive } from '../../responsive'
import { usePatientStore } from '../../store'
import { colors, radius, shadows, spacing } from '../../theme'
import { PrimaryButton } from './buttons'

export function QRDisplay({
  size = 180,
  showActions = true,
}: {
  size?: number
  showActions?: boolean
}) {
  const { qrValue, qrExpiresAt, qrTtlSeconds, qrRetryAt, qrFailureCount, regenerateQR, isOnline, activePatient } =
    usePatientStore()
  const { t } = useTranslation()
  const { width, modalMaxWidth, isCompact, isTablet } = useResponsive()
  const [timeLeft, setTimeLeft] = useState(qrTtlSeconds)
  const [retryIn, setRetryIn] = useState(0)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const qrSize = Math.min(size, isTablet ? 220 : isCompact ? 140 : Math.max(156, width - 140))
  const fullscreenQrSize = Math.min(isTablet ? 320 : 280, width - (isCompact ? 80 : 96))
  const qrCardMaxWidth = isTablet ? 420 : 360

  // Refresh at half the server TTL so the code on screen never reaches its
  // expiry while the app is open: the countdown runs to the renewal point, not
  // to the moment the server stops accepting the code. Failed refreshes wait
  // for the store's backoff (2s doubling to 60s) instead of retrying each tick.
  const attemptedFor = useRef('')
  useEffect(() => {
    const refreshDueAt = qrExpiresAt - qrRefreshMarginMs(qrTtlSeconds)
    const tick = () => {
      const now = Date.now()
      setTimeLeft(Math.max(0, Math.floor((refreshDueAt - now) / 1000)))
      setRetryIn(Math.max(0, Math.ceil((qrRetryAt - now) / 1000)))
      // One automatic attempt per code and per failure, never one per tick.
      const attemptKey = `${qrExpiresAt}:${qrFailureCount}`
      if (
        attemptedFor.current !== attemptKey &&
        shouldAutoRefresh({ now, refreshDueAt, retryAt: qrRetryAt, inFlight: false })
      ) {
        attemptedFor.current = attemptKey
        regenerateQR()
      }
    }
    tick()
    const timer = setInterval(tick, 1000)

    return () => clearInterval(timer)
  }, [qrExpiresAt, qrTtlSeconds, qrRetryAt, qrFailureCount, regenerateQR])

  // Returning from the background: the code may have aged past its window
  // while the app slept, so fetch a fresh one immediately (skipping backoff).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() >= qrExpiresAt - qrRefreshMarginMs(qrTtlSeconds)) {
        regenerateQR({ force: true })
      }
    })
    return () => subscription.remove()
  }, [qrExpiresAt, qrTtlSeconds, regenerateQR])

  const badgeColor = timeLeft > 30 ? colors.success : timeLeft > 10 ? colors.secondary : colors.error
  const retrying = qrFailureCount > 0
  const timerText = retrying
    ? retryIn > 0
      ? t('qr.retryingIn', { seconds: retryIn })
      : t('qr.retryingNow')
    : t('qr.refreshesInSeconds', { seconds: timeLeft })

  // The QR SVG re-encodes only when its value or size changes — not every second.
  const qrCode = useMemo(
    () => <QRCode value={qrValue} size={qrSize} color={colors.primary} backgroundColor="#FFFFFF" />,
    [qrValue, qrSize],
  )

  if (!activePatient || !qrValue) {
    return (
      <View style={[styles.card, styles.qrFallback]}>
        <Text style={styles.emptyMessage}>{t('qr.unavailable')}</Text>
      </View>
    )
  }

  const patientName = `${activePatient.firstName} ${activePatient.lastName}`.trim()
  const qrImageLabel = t('qr.imageLabel', { name: patientName })

  return (
    <>
      <Pressable
        style={[styles.qrCard, { maxWidth: qrCardMaxWidth }]}
        onPress={() => setShowFullscreen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={qrImageLabel}
        accessibilityHint={t('qr.enlargeHint')}
      >
        <View
          style={styles.qrStatus}
          accessible
          accessibilityRole="text"
          accessibilityLabel={isOnline ? t('qr.statusOnline') : t('qr.statusOffline')}
        >
          {isOnline ? (
            <View style={styles.qrStatusBadge}>
              <Wifi color={colors.success} size={14} />
            </View>
          ) : (
            <View style={[styles.qrStatusBadge, { backgroundColor: '#FFF4E1' }]}>
              <WifiOff color={colors.secondary} size={14} />
            </View>
          )}
        </View>
        <View style={styles.qrBox} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {qrCode}
          <View style={styles.qrCenterLogo}>
            <View style={styles.qrCenterLogoInner}>
              <Text style={styles.qrCenterLogoText}>M+</Text>
            </View>
          </View>
        </View>
        <View style={styles.qrTimer}>
          <View style={[styles.qrTimerDot, { backgroundColor: retrying ? colors.secondary : badgeColor }]} />
          <Text style={styles.cardSecondaryText} accessibilityLiveRegion={retrying ? 'polite' : 'none'}>
            {timerText}
          </Text>
        </View>
        <Text style={styles.qrInstruction}>{t('qr.instruction')}</Text>
        <Text style={styles.qrHint}>{t('qr.tapToEnlarge')}</Text>

        {showActions ? (
          <View style={styles.qrActions}>
            <PrimaryButton
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw color={colors.textPrimary} size={14} />}
              onPress={() => regenerateQR({ force: true })}
              accessibilityLabel={t('qr.refreshLabel')}
              accessibilityHint={t('qr.refreshHint')}
            >
              {t('qr.refresh')}
            </PrimaryButton>
            <PrimaryButton
              variant="ghost"
              size="sm"
              leftIcon={<Maximize2 color={colors.textPrimary} size={14} />}
              onPress={() => setShowFullscreen(true)}
              accessibilityLabel={t('qr.fullscreenLabel')}
            >
              {t('qr.fullscreen')}
            </PrimaryButton>
            <PrimaryButton
              variant="ghost"
              size="sm"
              leftIcon={<Share2 color={colors.textPrimary} size={14} />}
              accessibilityLabel={t('qr.shareLabel')}
              onPress={async () => {
                await Share.share({
                  title: t('qr.shareTitle'),
                  message: t('qr.shareMessage'),
                })
              }}
            >
              {t('qr.share')}
            </PrimaryButton>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={showFullscreen} transparent animationType="fade" onRequestClose={() => setShowFullscreen(false)}>
        <View style={styles.qrFullRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowFullscreen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
          <View style={[styles.qrFullCard, { width: modalMaxWidth }]} accessibilityViewIsModal>
            <Text style={styles.qrFullName} accessibilityRole="header">
              {patientName}
            </Text>
            <Text style={styles.qrFullSubtitle}>{t('qr.patientId')}</Text>
            <View style={styles.qrFullBox} accessible accessibilityRole="image" accessibilityLabel={qrImageLabel}>
              <QRCode value={qrValue} size={fullscreenQrSize} color={colors.primary} backgroundColor="#FFFFFF" />
            </View>
            <View style={styles.qrTimer}>
              <View style={[styles.qrTimerDot, { backgroundColor: retrying ? colors.secondary : badgeColor }]} />
              <Text style={styles.cardSecondaryText}>{timerText}</Text>
            </View>
            <PrimaryButton onPress={() => setShowFullscreen(false)} fullWidth>
              {t('common.close')}
            </PrimaryButton>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadows.card,
  },
  qrFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  emptyMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.strong,
  },
  qrStatus: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
  },
  qrStatusBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F7EF',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  qrCenterLogo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCenterLogoInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCenterLogoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  qrTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrTimerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  qrInstruction: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  qrHint: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  qrActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  qrFullRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
  },
  qrFullCard: {
    borderRadius: radius.xl,
    backgroundColor: '#FFFFFF',
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  qrFullName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  qrFullSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  qrFullBox: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
})
