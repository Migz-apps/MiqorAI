import { AlertCircle, AlertTriangle, ChevronRight, Clock3, Info } from 'lucide-react-native'
import React, { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTranslation } from '../../i18n'
import { colors, radius, shadows, spacing } from '../../theme'
import { formatDateTime, formatShortDate } from '../../utils'

export function HealthCard({
  title,
  subtitle,
  timestamp,
  icon,
  badge,
  onPress,
  children,
}: {
  title: string
  subtitle?: string
  timestamp?: string
  icon?: ReactNode
  badge?: { label: string; variant?: 'default' | 'success' | 'warning' | 'error' | 'info' }
  onPress?: () => void
  children?: ReactNode
}) {
  const badgeStyles = getBadgeStyles(badge?.variant)
  const { t } = useTranslation()
  const a11yLabel = [title, subtitle, badge?.label, timestamp ? formatShortDate(timestamp) : undefined]
    .filter(Boolean)
    .join(', ')

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? a11yLabel : undefined}
      accessibilityHint={onPress ? t('ui.cards.openDetails') : undefined}
    >
      <View style={styles.healthCardRow}>
        {icon ? <View style={styles.healthCardIcon}>{icon}</View> : null}
        <View style={styles.healthCardBody}>
          <View style={styles.healthCardTop}>
            <View style={styles.healthCardTextWrap}>
              <Text style={styles.healthCardTitle}>{title}</Text>
              {subtitle ? <Text style={styles.healthCardSubtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.healthCardMeta}>
              {badge ? (
                <View style={[styles.badgePill, badgeStyles.container]}>
                  <Text style={[styles.badgeText, badgeStyles.text]}>{badge.label}</Text>
                </View>
              ) : null}
              {onPress ? <ChevronRight color={colors.mutedForeground} size={18} /> : null}
            </View>
          </View>
          {timestamp ? (
            <View style={styles.cardTimestamp}>
              <Clock3 color={colors.mutedForeground} size={12} />
              <Text style={styles.cardTimestampText}>{formatShortDate(timestamp)}</Text>
            </View>
          ) : null}
          {children ? <View style={styles.healthCardChildren}>{children}</View> : null}
        </View>
      </View>
    </Pressable>
  )
}

export function ActivityCard({
  action,
  provider,
  details,
  timestamp,
}: {
  action: 'viewed' | 'updated' | 'shared' | 'downloaded'
  provider: string
  details: string
  timestamp: string
}) {
  const { t } = useTranslation()
  const config = {
    viewed: { label: t('ui.cards.activity.viewed'), variant: 'info' as const },
    updated: { label: t('ui.cards.activity.updated'), variant: 'success' as const },
    shared: { label: t('ui.cards.activity.shared'), variant: 'warning' as const },
    downloaded: { label: t('ui.cards.activity.downloaded'), variant: 'default' as const },
  }[action]
  const badge = getBadgeStyles(config.variant)

  return (
    <View style={styles.activityCard}>
      <View
        style={[styles.activityAvatar, badge.container]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[styles.activityAvatarText, badge.text]}>{provider.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.activityBody}>
        <View style={styles.activityTop}>
          <Text style={styles.activityProvider}>{provider}</Text>
          <View style={[styles.badgePill, badge.container]}>
            <Text style={[styles.badgeText, badge.text]}>{config.label}</Text>
          </View>
        </View>
        <Text style={styles.activityDetails}>{details}</Text>
        <Text style={styles.activityTime}>{formatDateTime(timestamp)}</Text>
      </View>
    </View>
  )
}

export function MedicationCard({
  name,
  dosage,
  frequency,
  prescribedBy,
  status,
  instructions,
  onPress,
}: {
  name: string
  dosage: string
  frequency: string
  prescribedBy: string
  status: 'current' | 'completed' | 'discontinued'
  instructions?: string
  onPress?: () => void
}) {
  const { t } = useTranslation()
  const statusConfig = {
    current: { label: t('ui.cards.medicationStatus.current'), variant: 'success' as const },
    completed: { label: t('ui.cards.medicationStatus.completed'), variant: 'default' as const },
    discontinued: { label: t('ui.cards.medicationStatus.discontinued'), variant: 'error' as const },
  }[status]

  return (
    <HealthCard title={name} subtitle={`${dosage} - ${frequency}`} badge={statusConfig} onPress={onPress}>
      <Text style={styles.cardSecondaryText}>{t('ui.cards.prescribedBy', { name: prescribedBy })}</Text>
      {instructions ? <Text style={styles.cardMutedItalic}>{instructions}</Text> : null}
    </HealthCard>
  )
}

export function AllergyBadge({
  name,
  severity,
  type,
  reaction,
  onPress,
  compact = false,
}: {
  name: string
  severity: 'mild' | 'moderate' | 'severe'
  type?: string
  reaction?: string
  onPress?: () => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  const config = {
    severe: {
      backgroundColor: colors.allergyBg,
      borderColor: '#F3B6B1',
      textColor: colors.error,
      label: t('ui.cards.severity.severe'),
      icon: <AlertTriangle color={colors.error} size={16} />,
    },
    moderate: {
      backgroundColor: '#FFF7E5',
      borderColor: '#F5D7A7',
      textColor: '#A56700',
      label: t('ui.cards.severity.moderate'),
      icon: <AlertCircle color="#A56700" size={16} />,
    },
    mild: {
      backgroundColor: '#F8F9FA',
      borderColor: colors.border,
      textColor: colors.textSecondary,
      label: t('ui.cards.severity.mild'),
      icon: <Info color={colors.textSecondary} size={16} />,
    },
  }[severity]
  const a11yLabel = t('ui.cards.allergyLabel', { name, severity: config.label })

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={a11yLabel}
        accessibilityHint={onPress ? t('ui.cards.openDetails') : undefined}
        style={[styles.compactAllergy, { backgroundColor: config.backgroundColor }]}
      >
        {config.icon}
        <Text style={[styles.compactAllergyText, { color: config.textColor }]}>{name}</Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={[
        a11yLabel,
        type ? t('ui.cards.allergyType', { type }) : undefined,
        reaction ? t('ui.cards.reaction', { reaction }) : undefined,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={onPress ? t('ui.cards.openDetails') : undefined}
      style={[styles.allergyCard, { backgroundColor: config.backgroundColor, borderColor: config.borderColor }]}
    >
      <View style={styles.allergyIconWrap}>{config.icon}</View>
      <View style={styles.allergyBody}>
        <View style={styles.allergyTop}>
          <Text style={[styles.allergyName, { color: config.textColor }]}>{name}</Text>
          <View style={[styles.badgePill, { backgroundColor: config.textColor }]}>
            <Text style={styles.badgeTextInverse}>{config.label}</Text>
          </View>
        </View>
        {type ? <Text style={styles.allergyType}>{t('ui.cards.allergyType', { type })}</Text> : null}
        {reaction ? (
          <Text style={[styles.allergyReaction, { color: config.textColor }]}>
            {t('ui.cards.reaction', { reaction })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

export function AllergyAlertCard({
  allergies,
  onViewAll,
  showAll = false,
}: {
  allergies: Array<{ name: string; severity: 'mild' | 'moderate' | 'severe' }>
  onViewAll?: () => void
  showAll?: boolean
}) {
  const { t } = useTranslation()

  if (!allergies.length) {
    return null
  }

  const toggleLabel = showAll ? t('ui.cards.viewLess') : t('home.viewAll')

  return (
    <View style={styles.allergyAlert}>
      <View style={styles.allergyAlertHeader}>
        <View style={styles.allergyAlertTitleWrap}>
          <AlertTriangle color={colors.error} size={18} />
          <Text style={styles.allergyAlertTitle} accessibilityRole="header">
            {t('home.allergyAlert')}
          </Text>
        </View>
        {onViewAll ? (
          <Pressable
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            accessibilityState={{ expanded: showAll }}
            hitSlop={12}
            style={styles.sectionActionTarget}
          >
            <Text style={styles.sectionAction}>{toggleLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.allergyAlertList}>
        {allergies.map((allergy) => (
          <View key={allergy.name} style={styles.allergyAlertItem}>
            <Text style={styles.allergyAlertItemName}>{allergy.name}</Text>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor:
                    allergy.severity === 'severe'
                      ? colors.error
                      : allergy.severity === 'moderate'
                      ? colors.secondary
                      : colors.textSecondary,
                },
              ]}
            >
              <Text style={styles.badgeTextInverse}>{t(`ui.cards.severity.${allergy.severity}`)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function getBadgeStyles(variant: 'default' | 'success' | 'warning' | 'error' | 'info' = 'default') {
  switch (variant) {
    case 'success':
      return { container: { backgroundColor: '#E8F7EF' }, text: { color: colors.success } }
    case 'warning':
      return { container: { backgroundColor: '#FFF4E1' }, text: { color: colors.secondary } }
    case 'error':
      return { container: { backgroundColor: '#FDECE8' }, text: { color: colors.error } }
    case 'info':
      return { container: { backgroundColor: '#EAF4FB' }, text: { color: colors.info } }
    default:
      return { container: { backgroundColor: colors.muted }, text: { color: colors.textSecondary } }
  }
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
  healthCardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  healthCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCardBody: {
    flex: 1,
    gap: spacing.sm,
  },
  healthCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  healthCardTextWrap: {
    flex: 1,
    gap: 2,
  },
  healthCardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  healthCardSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  healthCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgePill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextInverse: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardTimestampText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  healthCardChildren: {
    gap: spacing.sm,
  },
  cardSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  cardMutedItalic: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontStyle: 'italic',
  },
  activityCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  activityAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: {
    fontWeight: '800',
  },
  activityBody: {
    flex: 1,
    gap: 4,
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'center',
  },
  activityProvider: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  activityDetails: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  activityTime: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  compactAllergy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  compactAllergyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  allergyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  allergyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergyBody: {
    flex: 1,
    gap: 4,
  },
  allergyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'center',
  },
  allergyName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  allergyType: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  allergyReaction: {
    fontSize: 14,
    lineHeight: 20,
  },
  allergyAlert: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#F3B6B1',
    backgroundColor: colors.allergyBg,
    padding: spacing.lg,
  },
  allergyAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  allergyAlertTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  allergyAlertTitle: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionActionTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  allergyAlertList: {
    gap: spacing.sm,
  },
  allergyAlertItem: {
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.84)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allergyAlertItemName: {
    color: colors.error,
    fontWeight: '700',
  },
})
