import {
  ArrowLeftRight,
  Baby,
  Check,
  Heart,
  Shield,
  User,
  Users,
} from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { differenceInYears, parseISO } from 'date-fns'

import {
  Avatar,
  BottomSheet,
  ConfirmSheet,
  EmptyState,
  Header,
  InputField,
  OptionCards,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  SecondaryButton,
  useAppToast,
} from '../components/ui'
import { useTranslation } from '../i18n'
import { useResponsive } from '../responsive'
import { FamilyMember, usePatientStore } from '../store'
import { colors, radius, shadows, spacing } from '../theme'
import { formatDate } from '../utils'

const relationshipValues = ['child', 'parent', 'spouse', 'sibling', 'other'] as const

export function FamilyScreen() {
  const { profile, familyMembers, activeFamilyMemberId, setActiveFamilyMember, addFamilyMember, removeFamilyMember } =
    usePatientStore()
  const { isCompact, isLargePhone, stackedActions } = useResponsive()
  const { showToast } = useAppToast()
  const { t } = useTranslation()

  const relationshipOptions = useMemo(
    () =>
      relationshipValues.map((value) => ({
        value,
        label: t(`family.relationship.${value}`),
        description: t(`family.relationshipDesc.${value}`),
      })),
    [t],
  )

  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showMemberDetail, setShowMemberDetail] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [relationship, setRelationship] = useState<FamilyMember['relationship'] | ''>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const relationshipIcons = useMemo(
    () => ({
      child: Baby,
      spouse: Heart,
      parent: User,
      sibling: Users,
      other: User,
    }),
    [],
  )

  const resetForm = () => {
    setRelationship('')
    setFirstName('')
    setLastName('')
    setDateOfBirth('')
    setPhoneNumber('')
  }

  const handleAddMember = async () => {
    if (!relationship || !firstName || !lastName) {
      return
    }

    setIsAdding(true)
    try {
      await addFamilyMember({
        relationship,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || '2000-01-01',
        phoneNumber: phoneNumber || profile?.phoneNumber || '',
      })
      setShowAddSheet(false)
      resetForm()
      showToast(t('family.addSuccess'), 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('family.addError'), 'error')
    } finally {
      setIsAdding(false)
    }
  }

  const getAge = (value: string) => {
    try {
      return differenceInYears(new Date(), parseISO(value))
    } catch {
      return 0
    }
  }

  const describeMember = (member: FamilyMember) =>
    `${t(`family.relationship.${member.relationship}`)} | ${t('family.age', { count: getAge(member.profile.dateOfBirth) })}`

  const accessLevelLabel = (level: FamilyMember['accessLevel'], caregiverKey: string) =>
    level === 'full' ? t('family.fullAccess') : level === 'caregiver' ? t(caregiverKey) : t('family.viewOnly')

  return (
    <ScreenContainer>
      <Header title={t('family.yourFamily')} subtitle={t('family.subtitle')} />

      <View style={styles.headerSpacing}>
        <Pressable
          style={[styles.meCard, isCompact ? styles.meCardCompact : null, !activeFamilyMemberId ? styles.activeCard : null]}
          accessibilityRole="button"
          accessibilityState={{ selected: !activeFamilyMemberId }}
          accessibilityHint={t('family.a11y.ownProfileHint')}
          onPress={() => setActiveFamilyMember(null)}
        >
        <View style={[styles.meLeft, isCompact ? styles.meLeftCompact : null]}>
          <View>
            <Avatar name={`${profile?.firstName} ${profile?.lastName}`} size="lg" />
            {!activeFamilyMemberId ? (
              <View style={styles.activeCheck}>
                <Check color="#FFFFFF" size={14} />
              </View>
            ) : null}
          </View>
          <View style={styles.meCopy}>
            <View style={styles.inlineHeader}>
              <Text style={styles.meTitle}>
                {profile?.firstName} {profile?.lastName}
              </Text>
              <View style={styles.meBadge}>
                <Text style={styles.meBadgeText}>{t('family.me')}</Text>
              </View>
            </View>
            <Text style={styles.meSubtitle}>{t('family.primaryAccount')}</Text>
            <Text style={styles.meMeta}>{t('family.fullAccessFeatures')}</Text>
          </View>
        </View>
        {!activeFamilyMemberId ? <Text style={styles.activeText}>{t('common.active')}</Text> : null}
        </Pressable>
      </View>

      <View style={styles.sectionSpacing}>
        <SectionHeader title={t('family.familyMembers')} action={{ label: t('family.add'), onPress: () => setShowAddSheet(true) }} />

      {familyMembers.length ? (
        <View style={styles.stack}>
          {familyMembers.map((member) => {
            const Icon = relationshipIcons[member.relationship]
            const isActive = activeFamilyMemberId === member.id
            const memberName = `${member.profile.firstName} ${member.profile.lastName}`

            return (
              <Pressable
                key={member.id}
                accessible={false}
                style={[styles.memberCard, isCompact ? styles.memberCardCompact : null, isActive ? styles.activeCard : null]}
              >
                <View style={[styles.memberLeft, isCompact ? styles.memberLeftCompact : null]}>
                  <View style={styles.memberAvatar}>
                    <Icon color="#FFFFFF" size={22} />
                    {isActive ? (
                      <View style={styles.activeCheck}>
                        <Check color="#FFFFFF" size={14} />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>
                      {member.profile.firstName} {member.profile.lastName}
                    </Text>
                    <Text style={styles.memberMeta}>{describeMember(member)}</Text>
                    <View style={styles.accessPill}>
                      <Text style={styles.accessPillText}>{accessLevelLabel(member.accessLevel, 'family.caregiver')}</Text>
                    </View>
                  </View>
                </View>
                <View
                  style={[
                    styles.memberActions,
                    isCompact ? styles.memberActionsCompact : null,
                    stackedActions ? styles.memberActionsStacked : null,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.details')}
                    accessibilityHint={t('family.a11y.detailsHint', { name: memberName })}
                    onPress={() => {
                      setSelectedMember(member)
                      setShowMemberDetail(true)
                    }}
                  >
                    <Text style={styles.linkText}>{t('common.details')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.switchLink}
                    accessibilityRole="button"
                    accessibilityLabel={isActive ? t('family.switchBack') : t('family.switch')}
                    accessibilityHint={
                      isActive ? t('family.a11y.ownProfileHint') : t('family.a11y.switchHint', { name: memberName })
                    }
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setActiveFamilyMember(isActive ? null : member.id)}
                  >
                    <ArrowLeftRight color={colors.textSecondary} size={13} />
                    <Text style={styles.switchText}>{isActive ? t('family.switchBack') : t('family.switch')}</Text>
                  </Pressable>
                </View>
              </Pressable>
            )
          })}
        </View>
      ) : (
        <EmptyState
          icon={<Users color={colors.mutedForeground} size={26} />}
          title={t('family.noMembers')}
          message={t('family.addDesc')}
          action={{ label: t('family.addMember'), onPress: () => setShowAddSheet(true) }}
        />
      )}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Shield color={colors.primary} size={18} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle} accessibilityRole="header">{t('family.whyAdd')}</Text>
          <Text style={styles.infoLine}>- {t('family.why.children')}</Text>
          <Text style={styles.infoLine}>- {t('family.why.caregiver')}</Text>
          <Text style={styles.infoLine}>- {t('family.why.qr')}</Text>
          <Text style={styles.infoLine}>- {t('family.why.switching')}</Text>
        </View>
      </View>

      <BottomSheet
        isOpen={showAddSheet}
        onClose={() => {
          setShowAddSheet(false)
          resetForm()
        }}
        title={t('family.addMember')}
        subtitle={t('family.addSubtitle')}
        height="full"
      >
        <View style={styles.sheetStack}>
          <OptionCards value={relationship} onChange={setRelationship} options={relationshipOptions as never} />
          <View style={[styles.row, !isLargePhone ? styles.rowStacked : null]}>
            <View style={styles.half}>
              <InputField
                label={t('family.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('family.firstNamePlaceholder')}
              />
            </View>
            <View style={styles.half}>
              <InputField
                label={t('family.lastName')}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('family.lastNamePlaceholder')}
              />
            </View>
          </View>
          <InputField
            label={t('family.dateOfBirth')}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder={t('family.dobPlaceholder')}
          />
          <InputField
            label={t('family.phoneOptional')}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+250 788 123 456"
            keyboardType="phone-pad"
          />

          {relationship ? (
            <View style={styles.relationshipInfo} accessibilityLiveRegion="polite">
              <Text style={styles.relationshipInfoTitle}>
                {relationship === 'child' ? t('family.childInfoTitle') : t('family.caregiverAccess')}
              </Text>
              <Text style={styles.relationshipInfoText}>
                {relationship === 'child' ? t('family.childInfoText') : t('family.caregiverInfoText')}
              </Text>
            </View>
          ) : null}

          <PrimaryButton
            fullWidth
            size="lg"
            onPress={handleAddMember}
            isLoading={isAdding}
            disabled={!relationship || !firstName || !lastName}
          >
            {t('family.addMember')}
          </PrimaryButton>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showMemberDetail}
        onClose={() => {
          setShowMemberDetail(false)
          setSelectedMember(null)
        }}
        title={selectedMember ? `${selectedMember.profile.firstName} ${selectedMember.profile.lastName}` : t('family.memberDetails')}
        height="half"
      >
        {selectedMember ? (
          <View style={styles.sheetStack}>
            <View style={[styles.detailHero, isCompact ? styles.detailHeroCompact : null]}>
              <Avatar name={`${selectedMember.profile.firstName} ${selectedMember.profile.lastName}`} size="lg" />
              <View>
                <Text style={styles.detailHeroName}>
                  {selectedMember.profile.firstName} {selectedMember.profile.lastName}
                </Text>
                <Text style={styles.detailHeroMeta}>{describeMember(selectedMember)}</Text>
              </View>
            </View>

            <DetailRow label={t('family.dateOfBirth')} value={formatDate(selectedMember.profile.dateOfBirth)} />
            <DetailRow
              label={t('family.detail.accessLevel')}
              value={accessLevelLabel(selectedMember.accessLevel, 'family.caregiverAccess')}
            />
            <DetailRow label={t('family.detail.added')} value={formatDate(selectedMember.addedAt)} />
            <DetailRow label={t('family.detail.phone')} value={selectedMember.profile.phoneNumber} />

            <View style={styles.sheetActions}>
              <SecondaryButton
                fullWidth
                onPress={() => setActiveFamilyMember(selectedMember.id)}
                leftIcon={<ArrowLeftRight color={colors.primary} size={16} />}
                accessibilityHint={t('family.a11y.switchHint', {
                  name: `${selectedMember.profile.firstName} ${selectedMember.profile.lastName}`,
                })}
              >
                {t('family.switchToProfile')}
              </SecondaryButton>
              <PrimaryButton
                fullWidth
                variant="danger"
                onPress={() => setShowRemoveConfirm(true)}
                accessibilityHint={t('family.a11y.removeHint')}
              >
                {t('common.remove')}
              </PrimaryButton>
            </View>
          </View>
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={async () => {
          if (!selectedMember) {
            return
          }

          try {
            await removeFamilyMember(selectedMember.id)
            setShowRemoveConfirm(false)
            setShowMemberDetail(false)
            setSelectedMember(null)
            showToast(t('family.removeSuccess'), 'success')
          } catch (error) {
            showToast(error instanceof Error ? error.message : t('family.removeError'), 'error')
          }
        }}
        title={t('family.removeTitle')}
        message={t('family.removeMessage', { name: selectedMember?.profile.firstName ?? '' })}
        confirmLabel={t('common.remove')}
        variant="danger"
      />
    </ScreenContainer>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  headerSpacing: {
    marginTop: spacing.xl,
  },
  sectionSpacing: {
    marginTop: spacing.xl,
  },
  stack: {
    gap: spacing.md,
  },
  meCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.card,
  },
  meCardCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  activeCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  meLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  meLeftCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  meCopy: {
    flex: 1,
    gap: 4,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  meTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  meBadge: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,92,110,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  meBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  meSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  meMeta: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  activeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  activeCheck: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    ...shadows.card,
  },
  memberCardCompact: {
    flexDirection: 'column',
  },
  memberLeft: {
    flexDirection: 'row',
    gap: spacing.md,
    flex: 1,
  },
  memberLeftCompact: {
    width: '100%',
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCopy: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  memberMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  accessPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: '#E8F7EF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  accessPillText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  memberActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  memberActionsCompact: {
    width: '100%',
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberActionsStacked: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  switchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F8FBFC',
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 6,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  infoLine: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetStack: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowStacked: {
    flexDirection: 'column',
  },
  half: {
    flex: 1,
  },
  relationshipInfo: {
    borderRadius: radius.md,
    backgroundColor: '#EAF4FB',
    padding: spacing.lg,
    gap: 6,
  },
  relationshipInfoTitle: {
    color: colors.info,
    fontSize: 15,
    fontWeight: '700',
  },
  relationshipInfoText: {
    color: colors.info,
    fontSize: 13,
    lineHeight: 20,
  },
  detailHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailHeroCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  detailHeroName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  detailHeroMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  sheetActions: {
    gap: spacing.md,
  },
})
