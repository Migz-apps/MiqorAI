import { X } from 'lucide-react-native'
import React, { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useResponsive } from '../../responsive'
import { colors, radius, spacing } from '../../theme'
import { PrimaryButton, SecondaryButton } from './buttons'

type SheetHeight = 'quarter' | 'half' | 'full'

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  height = 'half',
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  height?: SheetHeight
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const { modalMaxWidth, isSmallPhone } = useResponsive()
  const maxHeight =
    height === 'quarter'
      ? windowHeight * 0.36
      : height === 'half'
      ? windowHeight * 0.62
      : windowHeight * 0.88

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            isSmallPhone ? styles.sheetCompact : null,
            {
              maxHeight,
              paddingBottom: insets.bottom + spacing.lg,
              width: modalMaxWidth,
              maxWidth: '100%',
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          {title || subtitle ? (
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
                {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} style={styles.sheetClose}>
                <X color={colors.mutedForeground} size={18} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = 'primary',
  isLoading = false,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel: string
  variant?: 'primary' | 'danger'
  isLoading?: boolean
}) {
  const { stackedActions } = useResponsive()

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="quarter">
      <View style={styles.confirmContent}>
        <Text style={styles.confirmTitle}>{title}</Text>
        <Text style={styles.confirmMessage}>{message}</Text>
        <View style={[styles.confirmActions, stackedActions ? styles.confirmActionsStacked : null]}>
          <SecondaryButton onPress={onClose} fullWidth>
            Cancel
          </SecondaryButton>
          <PrimaryButton onPress={onConfirm} variant={variant} fullWidth isLoading={isLoading}>
            {confirmLabel}
          </PrimaryButton>
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignSelf: 'center',
  },
  sheetCompact: {
    paddingHorizontal: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#D0D7DE',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmContent: {
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmActionsStacked: {
    flexDirection: 'column',
  },
})
