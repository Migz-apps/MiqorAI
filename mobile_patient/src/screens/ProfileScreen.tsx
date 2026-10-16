import { LinearGradient } from 'expo-linear-gradient'
import {
  AlertCircle,
  Bell,
  Check,
  CreditCard,
  Download,
  Edit2,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  Phone,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react-native'
import React, { useState } from 'react'
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native'

import {
  BottomSheet,
  ConfirmSheet,
  Header,
  InputField,
  PinInput,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  SecondaryButton,
  useAppToast,
} from '../components/ui'
import { useTranslation } from '../i18n'
import { useResponsive } from '../responsive'
import { mobileApi } from '../lib/api'
import { hasPin, setPin as savePin, verifyPin } from '../lib/pin'
import { usePatientStore } from '../store'
// Shared with app.config.ts so the displayed version matches the build.
import versionInfo from '../version.json'
import { colors, radius, shadows, spacing } from '../theme'
import { formatDate } from '../utils'

type LanguageOption = { code: 'en' | 'rw' | 'fr'; name: string }

// Language names are shown in their own language on purpose.
const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'fr', name: 'Français' },
]

export function ProfileScreen() {
  const {
    activePatient,
    profile,
    emergencyContacts,
    logout,
    requestExportData,
    deleteAccount,
    addEmergencyContact,
    updateProfile,
    setLanguage,
  } = usePatientStore()
  const { t, language } = useTranslation()

  const { showToast } = useAppToast()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactRelation, setNewContactRelation] = useState('')
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false)
  const [showChangePin, setShowChangePin] = useState(false)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const [devicePinSet, setDevicePinSet] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isSavingPin, setIsSavingPin] = useState(false)
  const [editFirstName, setEditFirstName] = useState(profile?.firstName || '')
  const [editLastName, setEditLastName] = useState(profile?.lastName || '')
  const [editPhone, setEditPhone] = useState(profile?.phoneNumber || '')
  const [editEmail, setEditEmail] = useState(profile?.email || '')
  const { isCompact, isLargePhone, stackedActions } = useResponsive()

  const handleLogout = async () => {
    await logout()
    setShowLogoutConfirm(false)
    showToast(t('profile.signedOut'), 'info')
  }

  const handleDelete = async () => {
    await deleteAccount()
    setShowDeleteConfirm(false)
  }

  const closeChangePin = () => {
    setShowChangePin(false)
    setCurrentPin('')
    setNewPin('')
    setConfirmNewPin('')
    setPinError('')
  }

  const handleChangePin = async () => {
    if (newPin.length !== 6) {
      setPinError(t('profile.pin.mustBeSix'))
      return
    }

    if (newPin !== confirmNewPin) {
      setPinError(t('profile.pin.mismatch'))
      return
    }

    setIsSavingPin(true)
    if (devicePinSet && !(await verifyPin(currentPin))) {
      setIsSavingPin(false)
      setPinError(t('profile.pin.currentIncorrect'))
      return
    }

    const saved = await savePin(newPin)
    setIsSavingPin(false)

    if (!saved) {
      setPinError(t('profile.pin.saveFailed'))
      return
    }

    closeChangePin()
    showToast(t('profile.pin.updated'), 'success')
  }

  return (
    <ScreenContainer>
      <Header title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <View style={styles.headerSpacing}>

      <LinearGradient colors={[colors.primary, '#0D7188']} style={[styles.heroCard, isCompact ? styles.heroCardCompact : null]}>
        <View style={[styles.heroAvatar, isCompact ? styles.heroAvatarCompact : null]}>
          <Text style={styles.heroAvatarText}>
            {activePatient?.firstName?.charAt(0)}
            {activePatient?.lastName?.charAt(0)}
          </Text>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {activePatient?.firstName} {activePatient?.lastName}
          </Text>
          <Text style={styles.heroPhone}>{activePatient?.phoneNumber}</Text>
          {activePatient?.email ? <Text style={styles.heroEmail}>{activePatient.email}</Text> : null}
        </View>

        <View style={styles.heroBadges}>
          {activePatient?.bloodType ? (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{t('profile.bloodBadge', { type: activePatient.bloodType })}</Text>
            </View>
          ) : null}
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {t('profile.memberSince', { date: activePatient?.createdAt ? formatDate(activePatient.createdAt) : t('profile.notAvailable') })}
            </Text>
          </View>
        </View>
      </LinearGradient>
      </View>

      <View style={styles.sectionStack}>
        <SectionHeader title={t('profile.sections.personal')} />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Edit2 color={colors.textSecondary} size={18} />}
            label={t('profile.editProfile')}
            description={t('profile.editProfileDesc')}
            onPress={() => setShowEditProfile(true)}
          />
          <SettingRow
            icon={<CreditCard color={colors.textSecondary} size={18} />}
            label={t('profile.nationalId')}
            description={activePatient?.nationalId || t('profile.notSet')}
          />
          <SettingRow
            icon={<FileText color={colors.textSecondary} size={18} />}
            label={t('profile.insuranceId')}
            description={activePatient?.insuranceId || t('profile.notSet')}
          />
          <SettingRow
            icon={<Heart color={colors.textSecondary} size={18} />}
            label={t('profile.bloodType')}
            description={activePatient?.bloodType || t('profile.notSet')}
            last
          />
        </View>
      </View>

      <View style={styles.sectionStack}>
        <SectionHeader title={t('profile.sections.emergency')} />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Phone color={colors.textSecondary} size={18} />}
            label={t('profile.manageContacts')}
            description={t('profile.contactsSaved', { count: emergencyContacts.length })}
            onPress={() => setShowEmergencyContacts(true)}
            last
          />
        </View>
      </View>

      <View style={styles.sectionStack}>
        <SectionHeader title={t('profile.sections.security')} />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Lock color={colors.textSecondary} size={18} />}
            label={t('profile.changePin')}
            description={t('profile.changePinDesc')}
            onPress={() => {
              void hasPin().then(setDevicePinSet)
              setShowChangePin(true)
            }}
            last
          />
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <SectionHeader title={t('profile.sections.appSettings')} />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Bell color={colors.textSecondary} size={18} />}
            label={t('profile.notifications')}
            description={t('profile.notificationsDesc')}
            toggle
            value={notificationsEnabled}
            onToggle={(v) => {
              setNotificationsEnabled(v)
              void mobileApi.updateSettings({ notifications: { push: v } }).catch(() => undefined)
            }}
          />
          <SettingRow
            icon={<Globe color={colors.textSecondary} size={18} />}
            label={t('profile.language')}
            description={LANGUAGE_OPTIONS.find((option) => option.code === language)?.name ?? 'English'}
            hint={t('profile.languageHint')}
            onPress={() => setShowLanguagePicker(true)}
            last
          />
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <SectionHeader title={t('profile.sections.dataPrivacy')} />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Download color={colors.textSecondary} size={18} />}
            label={t('profile.exportData')}
            description={t('profile.exportDataDesc')}
            onPress={async () => {
              try {
                const downloadUrl = await requestExportData()
                await Linking.openURL(downloadUrl)
                showToast(t('profile.exportReady'), 'success')
              } catch (error) {
                showToast(error instanceof Error ? error.message : t('profile.exportFailed'), 'error')
              }
            }}
          />
          <SettingRow
            icon={<Trash2 color={colors.error} size={18} />}
            label={t('profile.deleteAccount')}
            description={t('profile.deleteAccountDesc')}
            hint={t('profile.deleteAccountHint')}
            danger
            onPress={() => setShowDeleteConfirm(true)}
            last
          />
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <SectionHeader title={t('profile.sections.about')} />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<AlertCircle color={colors.textSecondary} size={18} />}
            label={t('profile.appVersion')}
            description={versionInfo.version}
            last
          />
        </View>
      </View>

      <PrimaryButton
        fullWidth
        variant="outline"
        leftIcon={<LogOut color={colors.error} size={18} />}
        onPress={() => setShowLogoutConfirm(true)}
      >
        {t('profile.logOut')}
      </PrimaryButton>

      <BottomSheet isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} title={t('profile.editProfile')} height="half">
        <View style={styles.sheetStack}>
          <View style={[styles.row, !isLargePhone ? styles.rowStacked : null]}>
            <View style={styles.half}>
              <InputField label={t('profile.firstName')} value={editFirstName} onChangeText={setEditFirstName} />
            </View>
            <View style={styles.half}>
              <InputField label={t('profile.lastName')} value={editLastName} onChangeText={setEditLastName} />
            </View>
          </View>
          <InputField label={t('profile.phoneNumber')} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
          <InputField label={t('profile.email')} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" />
          <View style={[styles.sheetActions, stackedActions ? styles.sheetActionsStacked : null]}>
            <SecondaryButton fullWidth onPress={() => setShowEditProfile(false)}>
              {t('common.cancel')}
            </SecondaryButton>
            <PrimaryButton
              fullWidth
              onPress={async () => {
                try {
                  await updateProfile({
                    firstName: editFirstName,
                    lastName: editLastName,
                    phoneNumber: editPhone,
                    email: editEmail,
                  })
                  setShowEditProfile(false)
                  showToast(t('profile.profileUpdated'), 'success')
                } catch (error) {
                  showToast(error instanceof Error ? error.message : t('profile.profileUpdateFailed'), 'error')
                }
              }}
            >
              {t('profile.saveChanges')}
            </PrimaryButton>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showEmergencyContacts}
        onClose={() => setShowEmergencyContacts(false)}
        title={t('profile.contacts.title')}
        height="half"
      >
        <View style={styles.sheetStack}>
          {emergencyContacts.map((contact) => (
            <View key={contact.id} style={[styles.contactCard, isCompact ? styles.contactCardCompact : null]}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>{contact.name.charAt(0)}</Text>
              </View>
              <View style={styles.contactCopy}>
                <View style={styles.inlineHeader}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.isPrimary ? (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>{t('profile.contacts.primary')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.contactMeta}>
                  {contact.relationship} | {contact.phoneNumber}
                </Text>
              </View>
              <Pressable
                onPress={() => Linking.openURL(`tel:${contact.phoneNumber}`)}
                style={[styles.contactAction, isCompact ? styles.contactActionCompact : null]}
                accessibilityRole="button"
                accessibilityLabel={t('profile.contacts.call', { name: contact.name })}
              >
                <Phone color={colors.primary} size={18} />
              </Pressable>
            </View>
          ))}
          <View style={{ gap: spacing.sm }}>
            <InputField label={t('profile.contacts.name')} value={newContactName} onChangeText={setNewContactName} />
            <InputField label={t('profile.contacts.phone')} value={newContactPhone} onChangeText={setNewContactPhone} keyboardType="phone-pad" />
            <InputField label={t('profile.contacts.relationship')} value={newContactRelation} onChangeText={setNewContactRelation} placeholder={t('profile.contacts.relationshipPlaceholder')} />
            <PrimaryButton
              fullWidth
              isLoading={isSavingContact}
              onPress={async () => {
                if (!newContactName.trim() || !newContactPhone.trim()) {
                  showToast(t('profile.contacts.required'), 'error')
                  return
                }
                setIsSavingContact(true)
                try {
                  await addEmergencyContact({
                    name: newContactName.trim(),
                    phoneNumber: newContactPhone.trim(),
                    relationship: newContactRelation.trim() || 'Family',
                    email: '',
                    isPrimary: false,
                  })
                  setNewContactName('')
                  setNewContactPhone('')
                  setNewContactRelation('')
                  showToast(t('profile.contacts.added'), 'success')
                } catch (error) {
                  showToast(error instanceof Error ? error.message : t('profile.contacts.addFailed'), 'error')
                } finally {
                  setIsSavingContact(false)
                }
              }}
            >
              {t('profile.contacts.add')}
            </PrimaryButton>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet isOpen={showChangePin} onClose={closeChangePin} title={t('profile.changePin')} height="half">
        <View style={styles.sheetStack}>
          {devicePinSet ? (
            <>
              <Text style={styles.pinLabel}>{t('profile.pin.current')}</Text>
              <PinInput
                value={currentPin}
                onChange={(value) => {
                  setCurrentPin(value)
                  setPinError('')
                }}
              />
            </>
          ) : null}

          <Text style={styles.pinLabel}>{t('profile.pin.new')}</Text>
          <PinInput
            value={newPin}
            onChange={(value) => {
              setNewPin(value)
              setPinError('')
            }}
          />

          <Text style={styles.pinLabel}>{t('profile.pin.confirm')}</Text>
          <PinInput
            value={confirmNewPin}
            onChange={(value) => {
              setConfirmNewPin(value)
              setPinError('')
            }}
            error={pinError}
          />

          <PrimaryButton
            fullWidth
            isLoading={isSavingPin}
            onPress={handleChangePin}
            disabled={newPin.length !== 6 || confirmNewPin.length !== 6 || (devicePinSet && currentPin.length !== 6)}
          >
            {t('profile.pin.save')}
          </PrimaryButton>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        title={t('profile.chooseLanguage')}
        height="half"
      >
        <View style={styles.languageList} accessibilityRole="radiogroup">
          {LANGUAGE_OPTIONS.map((option) => {
            const checked = option.code === language
            return (
              <Pressable
                key={option.code}
                style={[styles.languageOption, checked ? styles.languageOptionActive : null]}
                onPress={() => {
                  setLanguage(option.code)
                  setShowLanguagePicker(false)
                }}
                accessibilityRole="radio"
                accessibilityLabel={option.name}
                accessibilityState={{ checked }}
              >
                <Text style={[styles.languageName, checked ? styles.languageNameActive : null]}>{option.name}</Text>
                {checked ? <Check color={colors.primary} size={18} /> : null}
              </Pressable>
            )
          })}
        </View>
      </BottomSheet>

      <ConfirmSheet
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title={t('profile.logoutConfirm.title')}
        message={t('profile.logoutConfirm.message')}
        confirmLabel={t('profile.logOut')}
      />

      <ConfirmSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('profile.deleteConfirm.title')}
        message={t('profile.deleteConfirm.message')}
        confirmLabel={t('profile.deleteConfirm.confirm')}
        variant="danger"
      />
    </ScreenContainer>
  )
}

function SettingRow({
  icon,
  label,
  description,
  onPress,
  toggle = false,
  value = false,
  onToggle,
  badge,
  danger = false,
  last = false,
  hint,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  onPress?: () => void
  toggle?: boolean
  value?: boolean
  onToggle?: (value: boolean) => void
  badge?: string
  danger?: boolean
  last?: boolean
  hint?: string
}) {
  const { isCompact } = useResponsive()

  return (
    <Pressable
      style={[styles.settingRow, isCompact ? styles.settingRowCompact : null, !last ? styles.settingDivider : null]}
      onPress={onPress}
      accessible={!toggle}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      accessibilityHint={hint}
    >
      <View style={[styles.settingIcon, danger ? styles.settingIconDanger : null]}>{icon}</View>
      <View style={styles.settingCopy}>
        <View style={styles.inlineHeader}>
          <Text style={[styles.settingLabel, danger ? styles.settingLabelDanger : null]}>{label}</Text>
          {badge ? (
            <View style={styles.importantBadge}>
              <Text style={styles.importantBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      {toggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary }}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityHint={description}
          accessibilityState={{ checked: value }}
        />
      ) : onPress ? (
        <Text style={styles.chevron}>{'>'}</Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  headerSpacing: {
    marginTop: spacing.xl,
  },
  sectionSpacing: {
    marginTop: spacing.xl,
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.lg,
    ...shadows.strong,
  },
  heroCardCompact: {
    padding: spacing.lg,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarCompact: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  heroAvatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  heroCopy: {
    gap: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroPhone: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
  },
  heroEmail: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroBadge: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionStack: {
    gap: spacing.sm,
  },
  settingsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  settingRowCompact: {
    alignItems: 'flex-start',
  },
  settingDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: '#FDECE8',
  },
  settingCopy: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  settingLabelDanger: {
    color: colors.error,
  },
  settingDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  importantBadge: {
    borderRadius: radius.pill,
    backgroundColor: '#FFF4E1',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  importantBadgeText: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    color: colors.mutedForeground,
    fontSize: 22,
    lineHeight: 22,
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
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sheetActionsStacked: {
    flexDirection: 'column',
  },
  contactCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contactCardCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  contactAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactActionCompact: {
    alignSelf: 'flex-end',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  contactCopy: {
    flex: 1,
    gap: 2,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  contactName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  primaryBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  contactMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  languageList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  languageOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
  },
  languageOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  languageName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  languageNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  pinLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
})
