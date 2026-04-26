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
} from '../components/ui'
import { useResponsive } from '../responsive'
import { FamilyMember, usePatientStore } from '../store'
import { colors, radius, shadows, spacing } from '../theme'
import { formatDate } from '../utils'

const relationshipOptions = [
  { value: 'child', label: 'Child', description: 'Under 18, you manage their records' },
  { value: 'parent', label: 'Parent', description: 'Elderly parent you care for' },
  { value: 'spouse', label: 'Spouse', description: 'Partner with shared access' },
  { value: 'sibling', label: 'Sibling', description: 'Brother or sister' },
  { value: 'other', label: 'Other', description: 'Other family member or dependent' },
] as const

export function FamilyScreen() {
  const { profile, familyMembers, activeFamilyMemberId, setActiveFamilyMember, addFamilyMember, removeFamilyMember } =
    usePatientStore()
  const { isCompact, isLargePhone, stackedActions } = useResponsive()

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
    await new Promise((resolve) => setTimeout(resolve, 1200))

    addFamilyMember({
      id: `fam-${Date.now()}`,
      relationship,
      accessLevel: relationship === 'child' ? 'full' : 'caregiver',
      addedAt: new Date().toISOString(),
      profile: {
        id: `patient-${Date.now()}`,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || '2000-01-01',
        phoneNumber: phoneNumber || profile?.phoneNumber || '',
        publicKey: `ed25519:${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      },
    })

    setIsAdding(false)
    setShowAddSheet(false)
    resetForm()
  }

  const getAge = (value: string) => {
    try {
      return differenceInYears(new Date(), parseISO(value))
    } catch {
      return 0
    }
  }

  return (
    <ScreenContainer>
      <Header title="Your Family" subtitle="Manage family member profiles" />

      <Pressable
        style={[styles.meCard, isCompact ? styles.meCardCompact : null, !activeFamilyMemberId ? styles.activeCard : null]}
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
                <Text style={styles.meBadgeText}>You</Text>
              </View>
            </View>
            <Text style={styles.meSubtitle}>Primary Account Holder</Text>
            <Text style={styles.meMeta}>Full access to all features</Text>
          </View>
        </View>
        {!activeFamilyMemberId ? <Text style={styles.activeText}>Active</Text> : null}
      </Pressable>

      <SectionHeader title="Family Members" action={{ label: 'Add', onPress: () => setShowAddSheet(true) }} />

      {familyMembers.length ? (
        <View style={styles.stack}>
          {familyMembers.map((member) => {
            const Icon = relationshipIcons[member.relationship]
            const isActive = activeFamilyMemberId === member.id

            return (
              <Pressable
                key={member.id}
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
                    <Text style={styles.memberMeta}>
                      {member.relationship} | {getAge(member.profile.dateOfBirth)} years old
                    </Text>
                    <View style={styles.accessPill}>
                      <Text style={styles.accessPillText}>
                        {member.accessLevel === 'full'
                          ? 'Full Access'
                          : member.accessLevel === 'caregiver'
                          ? 'Caregiver'
                          : 'View Only'}
                      </Text>
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
                    onPress={() => {
                      setSelectedMember(member)
                      setShowMemberDetail(true)
                    }}
                  >
                    <Text style={styles.linkText}>Details</Text>
                  </Pressable>
                  <Pressable
                    style={styles.switchLink}
                    onPress={() => setActiveFamilyMember(isActive ? null : member.id)}
                  >
                    <ArrowLeftRight color={colors.textSecondary} size={13} />
                    <Text style={styles.switchText}>{isActive ? 'Switch Back' : 'Switch'}</Text>
                  </Pressable>
                </View>
              </Pressable>
            )
          })}
        </View>
      ) : (
        <EmptyState
          icon={<Users color={colors.mutedForeground} size={26} />}
          title="No family members yet"
          message="Add family members to manage their health records from your account."
          action={{ label: 'Add Family Member', onPress: () => setShowAddSheet(true) }}
        />
      )}

      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Shield color={colors.primary} size={18} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Why add family members?</Text>
          <Text style={styles.infoLine}>- Manage children&apos;s health records until they turn 13</Text>
          <Text style={styles.infoLine}>- Act as caregiver for elderly parents</Text>
          <Text style={styles.infoLine}>- One QR code per family member</Text>
          <Text style={styles.infoLine}>- Quick profile switching</Text>
        </View>
      </View>

      <BottomSheet
        isOpen={showAddSheet}
        onClose={() => {
          setShowAddSheet(false)
          resetForm()
        }}
        title="Add Family Member"
        subtitle="Create a profile for a family member"
        height="full"
      >
        <View style={styles.sheetStack}>
          <OptionCards value={relationship} onChange={setRelationship} options={relationshipOptions as never} />
          <View style={[styles.row, !isLargePhone ? styles.rowStacked : null]}>
            <View style={styles.half}>
              <InputField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
            </View>
            <View style={styles.half}>
              <InputField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
            </View>
          </View>
          <InputField label="Date of Birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" />
          <InputField
            label="Phone Number (Optional)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+250 788 123 456"
            keyboardType="phone-pad"
          />

          {relationship ? (
            <View style={styles.relationshipInfo}>
              <Text style={styles.relationshipInfoTitle}>
                {relationship === 'child' ? 'Full Access Granted' : 'Caregiver Access'}
              </Text>
              <Text style={styles.relationshipInfoText}>
                {relationship === 'child'
                  ? 'As a parent, you will have full control over this profile until they turn 13.'
                  : 'You will be able to view records and manage appointments, but cannot share access without their consent.'}
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
            Add Family Member
          </PrimaryButton>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showMemberDetail}
        onClose={() => {
          setShowMemberDetail(false)
          setSelectedMember(null)
        }}
        title={selectedMember ? `${selectedMember.profile.firstName} ${selectedMember.profile.lastName}` : 'Member Details'}
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
                <Text style={styles.detailHeroMeta}>
                  {selectedMember.relationship} | {getAge(selectedMember.profile.dateOfBirth)} years old
                </Text>
              </View>
            </View>

            <DetailRow label="Date of Birth" value={formatDate(selectedMember.profile.dateOfBirth)} />
            <DetailRow
              label="Access Level"
              value={
                selectedMember.accessLevel === 'full'
                  ? 'Full Access'
                  : selectedMember.accessLevel === 'caregiver'
                  ? 'Caregiver Access'
                  : 'View Only'
              }
            />
            <DetailRow label="Added" value={formatDate(selectedMember.addedAt)} />
            <DetailRow label="Phone" value={selectedMember.profile.phoneNumber} />

            <View style={styles.sheetActions}>
              <SecondaryButton
                fullWidth
                onPress={() => setActiveFamilyMember(selectedMember.id)}
                leftIcon={<ArrowLeftRight color={colors.primary} size={16} />}
              >
                Switch to Profile
              </SecondaryButton>
              <PrimaryButton fullWidth variant="danger" onPress={() => setShowRemoveConfirm(true)}>
                Remove
              </PrimaryButton>
            </View>
          </View>
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={() => {
          if (selectedMember) {
            removeFamilyMember(selectedMember.id)
          }
          setShowRemoveConfirm(false)
          setShowMemberDetail(false)
          setSelectedMember(null)
        }}
        title="Remove Family Member?"
        message={`${selectedMember?.profile.firstName} will be removed from your family account. Their medical records will remain in their own profile.`}
        confirmLabel="Remove"
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
