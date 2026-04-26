import { Maximize2, RefreshCw, Share2, Wifi, WifiOff } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

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
  const { qrValue, qrExpiresAt, regenerateQR, isOnline, activePatient } = usePatientStore()
  const { width, modalMaxWidth, isCompact, isTablet } = useResponsive()
  const [timeLeft, setTimeLeft] = useState(60)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const qrSize = Math.min(size, isTablet ? 220 : isCompact ? 140 : Math.max(156, width - 140))
  const fullscreenQrSize = Math.min(isTablet ? 320 : 280, width - (isCompact ? 80 : 96))
  const qrCardMaxWidth = isTablet ? 420 : 360

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((qrExpiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        regenerateQR()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [qrExpiresAt, regenerateQR])

  const badgeColor = timeLeft > 30 ? colors.success : timeLeft > 10 ? colors.secondary : colors.error

  if (!activePatient || !qrValue) {
    return (
      <View style={[styles.card, styles.qrFallback]}>
        <Text style={styles.emptyMessage}>No QR available</Text>
      </View>
    )
  }

  return (
    <>
      <Pressable style={[styles.qrCard, { maxWidth: qrCardMaxWidth }]} onPress={() => setShowFullscreen(true)}>
        <View style={styles.qrStatus}>
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
        <View style={styles.qrBox}>
          <QRCode value={qrValue} size={qrSize} color={colors.primary} backgroundColor="#FFFFFF" />
          <View style={styles.qrCenterLogo}>
            <View style={styles.qrCenterLogoInner}>
              <Text style={styles.qrCenterLogoText}>M+</Text>
            </View>
          </View>
        </View>
        <View style={styles.qrTimer}>
          <View style={[styles.qrTimerDot, { backgroundColor: badgeColor }]} />
          <Text style={styles.cardSecondaryText}>Refreshes in {timeLeft}s</Text>
        </View>
        <Text style={styles.qrInstruction}>Scan at hospital or pharmacy</Text>
        <Text style={styles.qrHint}>Tap to enlarge</Text>

        {showActions ? (
          <View style={styles.qrActions}>
            <PrimaryButton
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw color={colors.textPrimary} size={14} />}
              onPress={() => regenerateQR()}
            >
              Refresh
            </PrimaryButton>
            <PrimaryButton
              variant="ghost"
              size="sm"
              leftIcon={<Maximize2 color={colors.textPrimary} size={14} />}
              onPress={() => setShowFullscreen(true)}
            >
              Fullscreen
            </PrimaryButton>
            <PrimaryButton
              variant="ghost"
              size="sm"
              leftIcon={<Share2 color={colors.textPrimary} size={14} />}
              onPress={async () => {
                await Share.share({
                  title: 'My Med-Pass QR Code',
                  message: 'Scan this Med-Pass QR code to securely access my medical records.',
                })
              }}
            >
              Share
            </PrimaryButton>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={showFullscreen} transparent animationType="fade" onRequestClose={() => setShowFullscreen(false)}>
        <View style={styles.qrFullRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFullscreen(false)} />
          <View style={[styles.qrFullCard, { width: modalMaxWidth }]}>
            <Text style={styles.qrFullName}>
              {activePatient.firstName} {activePatient.lastName}
            </Text>
            <Text style={styles.qrFullSubtitle}>Med-Pass Patient ID</Text>
            <View style={styles.qrFullBox}>
              <QRCode value={qrValue} size={fullscreenQrSize} color={colors.primary} backgroundColor="#FFFFFF" />
            </View>
            <View style={styles.qrTimer}>
              <View style={[styles.qrTimerDot, { backgroundColor: badgeColor }]} />
              <Text style={styles.cardSecondaryText}>Refreshes in {timeLeft}s</Text>
            </View>
            <PrimaryButton onPress={() => setShowFullscreen(false)} fullWidth>
              Close
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
    ...StyleSheet.absoluteFillObject,
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
