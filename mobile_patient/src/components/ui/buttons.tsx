import * as Haptics from 'expo-haptics'
import React, { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { useResponsive } from '../../responsive'
import { colors, radius, shadows, spacing } from '../../theme'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'

export interface ButtonProps {
  children: ReactNode
  onPress?: () => void
  variant?: ButtonVariant
  fullWidth?: boolean
  disabled?: boolean
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PrimaryButton({
  children,
  onPress,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  size = 'md',
}: ButtonProps) {
  const variantStyle = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    outline: styles.buttonOutline,
    danger: styles.buttonDanger,
    ghost: styles.buttonGhost,
  }[variant]

  const textStyle = {
    primary: styles.buttonPrimaryText,
    secondary: styles.buttonSecondaryText,
    outline: styles.buttonOutlineText,
    danger: styles.buttonDangerText,
    ghost: styles.buttonGhostText,
  }[variant]

  const sizeStyle = {
    sm: styles.buttonSm,
    md: styles.buttonMd,
    lg: styles.buttonLg,
  }[size]

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress?.()
      }}
      disabled={disabled || isLoading}
      style={[
        styles.buttonBase,
        variantStyle,
        sizeStyle,
        fullWidth ? styles.buttonFullWidth : null,
        disabled || isLoading ? styles.buttonDisabled : null,
      ]}
    >
      {isLoading ? <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFFFFF'} /> : leftIcon}
      <Text style={[styles.buttonTextBase, textStyle]}>{children}</Text>
      {!isLoading ? rightIcon : null}
    </Pressable>
  )
}

export function SecondaryButton(props: ButtonProps) {
  return <PrimaryButton {...props} variant={props.variant ?? 'outline'} />
}

export function TextButton({
  children,
  onPress,
}: {
  children: ReactNode
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress?.()
      }}
    >
      <Text style={styles.textButton}>{children}</Text>
    </Pressable>
  )
}

export function QuickAction({
  icon,
  label,
  onPress,
  variant = 'default',
}: {
  icon: ReactNode
  label: string
  onPress?: () => void
  variant?: 'default' | 'danger' | 'warning'
}) {
  const { isCompact, isTablet } = useResponsive()
  const background = {
    default: colors.primaryLight,
    danger: '#FDECE8',
    warning: '#FFF4E1',
  }[variant]

  const textColor = {
    default: colors.primary,
    danger: colors.error,
    warning: colors.secondary,
  }[variant]

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync()
        onPress?.()
      }}
      style={[
        styles.quickAction,
        { backgroundColor: background },
        isCompact ? styles.quickActionCompact : null,
        isTablet ? styles.quickActionTablet : null,
      ]}
    >
      <View style={styles.quickActionIcon}>{icon}</View>
      <Text style={[styles.quickActionLabel, isCompact ? styles.quickActionLabelCompact : null, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
    ...shadows.card,
  },
  buttonOutline: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonGhost: {
    backgroundColor: colors.muted,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
  },
  buttonSecondaryText: {
    color: colors.secondaryForeground,
  },
  buttonOutlineText: {
    color: colors.primary,
  },
  buttonDangerText: {
    color: '#FFFFFF',
  },
  buttonGhostText: {
    color: colors.textPrimary,
  },
  buttonTextBase: {
    fontWeight: '700',
  },
  buttonSm: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  buttonMd: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  buttonLg: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  textButton: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  quickAction: {
    minWidth: 0,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  quickActionCompact: {
    paddingHorizontal: spacing.sm,
  },
  quickActionTablet: {
    paddingHorizontal: spacing.lg,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickActionLabelCompact: {
    fontSize: 11,
  },
})
