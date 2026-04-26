import * as Haptics from 'expo-haptics'
import { Check, Search, X } from 'lucide-react-native'
import React, { useRef } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { useResponsive } from '../../responsive'
import { colors, radius, shadows, spacing } from '../../theme'

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline = false,
  error,
}: {
  label?: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad'
  secureTextEntry?: boolean
  multiline?: boolean
  error?: string
}) {
  return (
    <View style={styles.fieldGroup}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.input, multiline ? styles.inputMultiline : null, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  )
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
}) {
  const { isCompact } = useResponsive()

  return (
    <View style={[styles.searchWrap, isCompact ? styles.searchWrapCompact : null]}>
      <Search color={colors.mutedForeground} size={18} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')}>
          <X color={colors.mutedForeground} size={18} />
        </Pressable>
      ) : null}
    </View>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <Pressable
      style={styles.checkboxRow}
      onPress={() => {
        void Haptics.selectionAsync()
        onChange(!checked)
      }}
    >
      <View style={[styles.checkboxBox, checked ? styles.checkboxBoxChecked : null]}>
        {checked ? <Check color="#FFFFFF" size={14} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  )
}

export function PinInput({
  value,
  onChange,
  length = 6,
  error,
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: string
}) {
  const inputRef = useRef<TextInput>(null)
  const digits = value.split('').slice(0, length)

  return (
    <Pressable style={styles.pinContainer} onPress={() => inputRef.current?.focus()}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        style={styles.hiddenInput}
        maxLength={length}
      />
      <View style={styles.pinRow}>
        {Array.from({ length }).map((_, index) => (
          <View key={index} style={[styles.pinBox, error ? styles.pinBoxError : null]}>
            <Text style={styles.pinDigit}>{digits[index] || ''}</Text>
          </View>
        ))}
      </View>
      {error ? <Text style={styles.fieldErrorCentered}>{error}</Text> : null}
    </Pressable>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  const { isCompact, isSmallPhone, isTablet } = useResponsive()

  return (
    <View style={[styles.segmented, isSmallPhone ? styles.segmentedCompact : null]}>
      {options.map((option) => {
        const active = option.value === value

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              void Haptics.selectionAsync()
              onChange(option.value)
            }}
            style={[styles.segmentedItem, active ? styles.segmentedItemActive : null]}
          >
            <Text
              style={[
                styles.segmentedText,
                isCompact ? styles.segmentedTextCompact : null,
                isTablet ? styles.segmentedTextTablet : null,
                active ? styles.segmentedTextActive : null,
              ]}
              numberOfLines={2}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function OptionCards<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; description?: string }>
  value: T | ''
  onChange: (value: T) => void
}) {
  const { isCompact } = useResponsive()

  return (
    <View style={styles.optionCards}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              void Haptics.selectionAsync()
              onChange(option.value)
            }}
            style={[styles.optionCard, active ? styles.optionCardActive : null]}
          >
            <View style={[styles.optionRadio, active ? styles.optionRadioActive : null]}>
              {active ? <View style={styles.optionRadioDot} /> : null}
            </View>
            <View style={styles.optionCardCopy}>
              <Text style={[styles.optionCardTitle, isCompact ? styles.optionCardTitleCompact : null]}>{option.label}</Text>
              {option.description ? <Text style={styles.optionCardDescription}>{option.description}</Text> : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    color: colors.error,
    fontSize: 12,
  },
  fieldErrorCentered: {
    color: colors.error,
    fontSize: 12,
    textAlign: 'center',
  },
  searchWrap: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  searchWrapCompact: {
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  pinContainer: {
    gap: spacing.sm,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pinBox: {
    width: 44,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxError: {
    borderColor: colors.error,
  },
  pinDigit: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segmentedCompact: {
    gap: 6,
  },
  segmentedItem: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  segmentedItemActive: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  segmentedText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  segmentedTextCompact: {
    fontSize: 12,
  },
  segmentedTextTablet: {
    fontSize: 15,
  },
  segmentedTextActive: {
    color: colors.textPrimary,
  },
  optionCards: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  optionRadioActive: {
    borderColor: colors.primary,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionCardCopy: {
    flex: 1,
    gap: 4,
  },
  optionCardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  optionCardTitleCompact: {
    fontSize: 14,
  },
  optionCardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
})
