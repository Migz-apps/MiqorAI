import { WifiOff } from 'lucide-react-native'
import React, { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, radius, spacing } from '../../theme'
import { PrimaryButton } from './buttons'

export function LoadingOverlay({
  message,
  fullScreen = false,
}: {
  message: string
  fullScreen?: boolean
}) {
  return (
    <View style={[styles.loadingRoot, fullScreen ? styles.loadingRootFull : null]}>
      <View style={styles.loadingBadge}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  )
}

export function SplashScreen() {
  return (
    <View style={styles.splashRoot}>
      <View style={styles.splashMark}>
        <Text style={styles.splashMarkText}>M+</Text>
      </View>
      <Text style={styles.splashTitle}>MediPass</Text>
      <Text style={styles.splashSubtitle}>Patient Portal</Text>
      <View style={styles.splashLoaderTrack}>
        <View style={styles.splashLoaderFill} />
      </View>
    </View>
  )
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonLineLarge} />
      <View style={styles.skeletonLineMedium} />
      <View style={styles.skeletonLineSmall} />
    </View>
  )
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode
  title: string
  message?: string
  action?: { label: string; onPress: () => void }
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {action ? <PrimaryButton onPress={action.onPress}>{action.label}</PrimaryButton> : null}
    </View>
  )
}

export function OfflineBanner({
  queueCount,
  lastSync,
}: {
  queueCount?: number
  lastSync?: string
}) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.offlineBanner, { paddingTop: insets.top + spacing.sm }]}>
      <WifiOff color={colors.secondaryForeground} size={16} />
      <Text style={styles.offlineBannerText}>
        You&apos;re offline.
        {queueCount ? ` ${queueCount} changes pending.` : ''}
        {lastSync ? ` Last synced: ${lastSync}` : ''}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingRoot: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    backgroundColor: colors.background,
  },
  loadingRootFull: {
    flex: 1,
  },
  loadingBadge: {
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  splashRoot: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  splashMark: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashMarkText: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '900',
  },
  splashTitle: {
    marginTop: spacing.xxl,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  splashSubtitle: {
    marginTop: spacing.sm,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
  },
  splashLoaderTrack: {
    marginTop: 56,
    width: 108,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  splashLoaderFill: {
    width: '70%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  skeletonLineLarge: {
    height: 18,
    width: '72%',
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    marginBottom: spacing.md,
  },
  skeletonLineMedium: {
    height: 14,
    width: '52%',
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    marginBottom: spacing.sm,
  },
  skeletonLineSmall: {
    height: 12,
    width: '28%',
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  offlineBannerText: {
    color: colors.secondaryForeground,
    fontSize: 13,
    fontWeight: '600',
  },
})
