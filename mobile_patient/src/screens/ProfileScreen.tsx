import { LinearGradient } from 'expo-linear-gradient'
import {
  AlertCircle,
  Bell,
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
import { useResponsive } from '../responsive'
import { mobileApi } from '../lib/api'
import { hasPin, setPin as savePin, verifyPin } from '../lib/pin'
import { usePatientStore } from '../store'
import appConfig from '../../app.json'
import { colors, radius, shadows, spacing } from '../theme'
import { formatDate } from '../utils'

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
  } = usePatientStore()

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
    showToast("You've been signed out.", 'info')
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
      setPinError('PIN must be 6 digits')
      return
    }

    if (newPin !== confirmNewPin) {
      setPinError('PINs do not match')
      return
    }

    setIsSavingPin(true)
    if (devicePinSet && !(await verifyPin(currentPin))) {
      setIsSavingPin(false)
      setPinError('Current PIN is incorrect')
      return
    }

    const saved = await savePin(newPin)
    setIsSavingPin(false)

    if (!saved) {
      setPinError('Could not save your PIN on this device.')
      return
    }

    closeChangePin()
    showToast('PIN updated.', 'success')
  }

  return (
    <ScreenContainer>
      <Header title="Profile" subtitle="Manage your account" />

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
              <Text style={styles.heroBadgeText}>Blood: {activePatient.bloodType}</Text>
            </View>
          ) : null}
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              Member since {activePatient?.createdAt ? formatDate(activePatient.createdAt) : 'N/A'}
            </Text>
          </View>
        </View>
      </LinearGradient>
      </View>

      <View style={styles.sectionStack}>
        <SectionHeader title="Personal Information" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Edit2 color={colors.textSecondary} size={18} />}
            label="Edit Profile"
            description="Update your personal details"
            onPress={() => setShowEditProfile(true)}
          />
          <SettingRow
            icon={<CreditCard color={colors.textSecondary} size={18} />}
            label="National ID"
            description={activePatient?.nationalId || 'Not set'}
          />
          <SettingRow
            icon={<FileText color={colors.textSecondary} size={18} />}
            label="Insurance ID"
            description={activePatient?.insuranceId || 'Not set'}
          />
          <SettingRow
            icon={<Heart color={colors.textSecondary} size={18} />}
            label="Blood Type"
            description={activePatient?.bloodType || 'Not set'}
            last
          />
        </View>
      </View>

      <View style={styles.sectionStack}>
        <SectionHeader title="Emergency Contacts" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Phone color={colors.textSecondary} size={18} />}
            label="Manage Emergency Contacts"
            description={`${emergencyContacts.length} contact${emergencyContacts.length !== 1 ? 's' : ''} saved`}
            onPress={() => setShowEmergencyContacts(true)}
            last
          />
        </View>
      </View>

      <View style={styles.sectionStack}>
        <SectionHeader title="Security" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Lock color={colors.textSecondary} size={18} />}
            label="Change PIN"
            description="Update your security PIN"
            onPress={() => {
              void hasPin().then(setDevicePinSet)
              setShowChangePin(true)
            }}
            last
          />
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <SectionHeader title="App Settings" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Bell color={colors.textSecondary} size={18} />}
            label="Notifications"
            description="Appointment reminders and alerts"
            toggle
            value={notificationsEnabled}
            onToggle={(v) => {
              setNotificationsEnabled(v)
              void mobileApi.updateSettings({ notifications: { push: v } }).catch(() => undefined)
            }}
          />
          <SettingRow
            icon={<Globe color={colors.textSecondary} size={18} />}
            label="Language"
            description="English"
            last
          />
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <SectionHeader title="Data & Privacy" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<Download color={colors.textSecondary} size={18} />}
            label="Export My Data"
            description="Download all your health records"
            onPress={async () => {
              try {
                const downloadUrl = await requestExportData()
                await Linking.openURL(downloadUrl)
                showToast('Your export is ready to download.', 'success')
              } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to prepare export.', 'error')
              }
            }}
          />
          <SettingRow
            icon={<Trash2 color={colors.error} size={18} />}
            label="Delete Account"
            description="Permanently delete all data"
            danger
            onPress={() => setShowDeleteConfirm(true)}
            last
          />
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <SectionHeader title="About" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon={<AlertCircle color={colors.textSecondary} size={18} />}
            label="App Version"
            description={appConfig.expo.version}
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
        Log Out
      </PrimaryButton>

      <BottomSheet isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} title="Edit Profile" height="half">
        <View style={styles.sheetStack}>
          <View style={[styles.row, !isLargePhone ? styles.rowStacked : null]}>
            <View style={styles.half}>
              <InputField label="First Name" value={editFirstName} onChangeText={setEditFirstName} />
            </View>
            <View style={styles.half}>
              <InputField label="Last Name" value={editLastName} onChangeText={setEditLastName} />
            </View>
          </View>
          <InputField label="Phone Number" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
          <InputField label="Email" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" />
          <View style={[styles.sheetActions, stackedActions ? styles.sheetActionsStacked : null]}>
            <SecondaryButton fullWidth onPress={() => setShowEditProfile(false)}>
              Cancel
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
                  showToast('Profile updated.', 'success')
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Unable to update profile.', 'error')
                }
              }}
            >
              Save Changes
            </PrimaryButton>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        isOpen={showEmergencyContacts}
        onClose={() => setShowEmergencyContacts(false)}
        title="Emergency Contacts"
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
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.contactMeta}>
                  {contact.relationship} | {contact.phoneNumber}
                </Text>
              </View>
              <Pressable onPress={() => Linking.openURL(`tel:${contact.phoneNumber}`)} style={isCompact ? styles.contactActionCompact : null}>
                <Phone color={colors.primary} size={18} />
              </Pressable>
            </View>
          ))}
          <View style={{ gap: spacing.sm }}>
            <InputField label="Name" value={newContactName} onChangeText={setNewContactName} />
            <InputField label="Phone" value={newContactPhone} onChangeText={setNewContactPhone} keyboardType="phone-pad" />
            <InputField label="Relationship" value={newContactRelation} onChangeText={setNewContactRelation} placeholder="e.g. Spouse" />
            <PrimaryButton
              fullWidth
              isLoading={isSavingContact}
              onPress={async () => {
                if (!newContactName.trim() || !newContactPhone.trim()) {
                  showToast('Name and phone are required.', 'error')
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
                  showToast('Emergency contact added.', 'success')
                } catch (error) {
                  showToast(error instanceof Error ? error.message : 'Could not add contact.', 'error')
                } finally {
                  setIsSavingContact(false)
                }
              }}
            >
              Add Emergency Contact
            </PrimaryButton>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet isOpen={showChangePin} onClose={closeChangePin} title="Change PIN" height="half">
        <View style={styles.sheetStack}>
          {devicePinSet ? (
            <>
              <Text style={styles.pinLabel}>Current PIN</Text>
              <PinInput
                value={currentPin}
                onChange={(value) => {
                  setCurrentPin(value)
                  setPinError('')
                }}
              />
            </>
          ) : null}

          <Text style={styles.pinLabel}>New PIN</Text>
          <PinInput
            value={newPin}
            onChange={(value) => {
              setNewPin(value)
              setPinError('')
            }}
          />

          <Text style={styles.pinLabel}>Confirm New PIN</Text>
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
            Save PIN
          </PrimaryButton>
        </View>
      </BottomSheet>

      <ConfirmSheet
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out?"
        message="You will need to sign in again with your email and password."
        confirmLabel="Log Out"
      />

      <ConfirmSheet
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Account?"
        message="This action cannot be undone. All your medical records will be permanently deleted."
        confirmLabel="Delete Everything"
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
}) {
  const { isCompact } = useResponsive()

  return (
    <Pressable
      style={[styles.settingRow, isCompact ? styles.settingRowCompact : null, !last ? styles.settingDivider : null]}
      onPress={onPress}
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
        <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.primary }} />
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
  pinLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
})
