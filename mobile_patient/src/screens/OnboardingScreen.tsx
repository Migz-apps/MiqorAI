import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  QrCode,
  Shield,
  Users,
} from 'lucide-react-native'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  CheckboxField,
  InputField,
  PinInput,
  PrimaryButton,
  TextButton,
} from '../components/ui'
import { setPin as savePin } from '../lib/pin'
import { useResponsive } from '../responsive'
import { usePatientStore } from '../store'
import { PrivacyScreen } from './PrivacyScreen'
import { TermsScreen } from './TermsScreen'
import { colors, radius, spacing } from '../theme'

type OnboardingStep = 'welcome' | 'features' | 'create' | 'pin' | 'complete'

const features = [
  {
    icon: Shield,
    title: 'Your Data, Your Control',
    description:
      'Only you decide who sees your medical records. No hospital-to-hospital sharing without your consent.',
  },
  {
    icon: QrCode,
    title: 'Instant Access',
    description: 'Show your QR code at any hospital or pharmacy to securely share your records.',
  },
  {
    icon: Users,
    title: 'Family Profiles',
    description: 'Manage health records for your children and elderly parents from one account.',
  },
  {
    icon: Lock,
    title: 'Encrypted Storage',
    description: 'Your data is encrypted on this device and in transit to MiqorAI servers.',
  },
]

export function OnboardingScreen() {
  const { setOnboardingComplete } = usePatientStore()
  const { isCompact, isLargePhone, isTablet, stackedActions, horizontalPadding, contentMaxWidth } = useResponsive()
  const shellPadding = horizontalPadding + (isTablet ? spacing.xl : spacing.md)
  const stepMaxWidth = Math.min(contentMaxWidth, 560)

  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | null>(null)
  const [featureIndex, setFeatureIndex] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isSavingPin, setIsSavingPin] = useState(false)

  const activeFeature = features[featureIndex]

  const handlePin = async () => {
    if (pin.length !== 6) {
      setPinError('PIN must be 6 digits')
      return
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }

    setPinError('')
    setIsSavingPin(true)
    const saved = await savePin(pin)
    setIsSavingPin(false)

    if (!saved) {
      setPinError('Could not save your PIN on this device. Please try again.')
      return
    }

    setStep('complete')
  }

  if (legalView === 'terms') {
    return <TermsScreen onBack={() => setLegalView(null)} />
  }

  if (legalView === 'privacy') {
    return <PrivacyScreen onBack={() => setLegalView(null)} />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {step === 'welcome' ? (
        <View style={[styles.centeredStep, { paddingHorizontal: shellPadding }]}>
          <View style={[styles.mark, isCompact ? styles.markCompact : null]}>
            <Text style={styles.markText}>M+</Text>
          </View>
          <Text style={[styles.welcomeTitle, isCompact ? styles.welcomeTitleCompact : null]}>MiqorAI</Text>
          <Text style={[styles.welcomeSubtitle, isCompact ? styles.welcomeSubtitleCompact : null]}>Patient Portal</Text>
          <Text style={[styles.tagline, isCompact ? styles.taglineCompact : null]}>Your health records.{"\n"}In your pocket.{"\n"}Always.</Text>

          <View style={[styles.buttonStack, { maxWidth: Math.min(stepMaxWidth, 420) }]}>
            <PrimaryButton fullWidth size="lg" onPress={() => setStep('features')}>
              Get Started
            </PrimaryButton>
          </View>

          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => setLegalView('terms')}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.legalLink} onPress={() => setLegalView('privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      ) : null}

      {step === 'features' ? (
        <View style={[styles.stepShell, { paddingHorizontal: shellPadding, maxWidth: stepMaxWidth }]}>
          <View style={styles.stepTopBar}>
            <View />
            <TextButton onPress={() => setStep('create')}>Skip</TextButton>
          </View>

          <View style={[styles.featureBody, { maxWidth: Math.min(stepMaxWidth, 460) }]}>
            <View style={[styles.featureIconWrap, isCompact ? styles.featureIconWrapCompact : null]}>
              <activeFeature.icon color={colors.primary} size={44} />
            </View>
            <Text style={[styles.featureTitle, isCompact ? styles.featureTitleCompact : null]}>{activeFeature.title}</Text>
            <Text style={[styles.featureDescription, isCompact ? styles.featureDescriptionCompact : null]}>{activeFeature.description}</Text>
          </View>

          <View style={styles.dotRow}>
            {features.map((feature, index) => (
              <Pressable
                key={feature.title}
                onPress={() => setFeatureIndex(index)}
                style={[styles.dot, index === featureIndex ? styles.dotActive : null]}
              />
            ))}
          </View>

          <View style={[styles.featureActions, stackedActions ? styles.featureActionsStacked : null]}>
            <SecondaryStepper
              label="Back"
              icon={<ChevronLeft color={colors.primary} size={18} />}
              disabled={featureIndex === 0}
              onPress={() => setFeatureIndex((value) => Math.max(value - 1, 0))}
            />
            <PrimaryButton
              fullWidth
              onPress={() => {
                if (featureIndex === features.length - 1) {
                  setStep('create')
                  return
                }
                setFeatureIndex((value) => value + 1)
              }}
              rightIcon={<ChevronRight color="#FFFFFF" size={18} />}
            >
              {featureIndex === features.length - 1 ? 'Create Account' : 'Next'}
            </PrimaryButton>
          </View>
        </View>
      ) : null}

      {step === 'create' ? (
        <View style={[styles.stepShell, { paddingHorizontal: shellPadding, maxWidth: stepMaxWidth }]}>
          <BackLink label="Back" onPress={() => setStep('features')} />
          <Text style={styles.stepTitle}>Create Your Profile</Text>
          <Text style={styles.stepSubtitle}>This setup prepares the device. You will sign in with your patient account afterwards.</Text>

          <View style={[styles.formGrid, !isLargePhone ? styles.formGridStacked : null]}>
            <View style={styles.formHalf}>
              <InputField label="First Name" placeholder="Jean" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={styles.formHalf}>
              <InputField label="Last Name" placeholder="Mugisha" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <InputField
            label="Phone Number"
            placeholder="+250 788 123 456"
            value={phoneNumber}
            keyboardType="phone-pad"
            onChangeText={setPhoneNumber}
          />

          <CheckboxField
            label="I agree to the Terms of Service and Privacy Policy"
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
          />

          <Text style={styles.legalInline}>
            Read the{' '}
            <Text style={styles.legalLink} onPress={() => setLegalView('terms')}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.legalLink} onPress={() => setLegalView('privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>

          <View style={styles.flexSpacer} />

          <PrimaryButton
            fullWidth
            size="lg"
            onPress={() => setStep('pin')}
            disabled={!firstName || !lastName || !phoneNumber || !acceptedTerms}
          >
            Continue
          </PrimaryButton>
        </View>
      ) : null}

      {step === 'pin' ? (
        <View style={[styles.stepShell, { paddingHorizontal: shellPadding, maxWidth: stepMaxWidth }]}>
          <BackLink label="Back" onPress={() => setStep('create')} />
          <View style={styles.sheetTitleRow}>
            <Lock color={colors.primary} size={24} />
            <Text style={styles.stepTitle}>Secure Your App</Text>
          </View>
          <Text style={styles.stepSubtitle}>
            Your PIN unlocks MiqorAI on this device. It is stored only on this phone.
          </Text>

          <Text style={styles.pinTitle}>Create a 6-digit PIN</Text>
          <PinInput value={pin} onChange={setPin} />

          {pin.length === 6 ? (
            <>
              <Text style={styles.pinTitle}>Confirm PIN</Text>
              <PinInput value={confirmPin} onChange={setConfirmPin} error={pinError} />
            </>
          ) : null}

          <View style={styles.flexSpacer} />

          <PrimaryButton
            fullWidth
            size="lg"
            onPress={handlePin}
            isLoading={isSavingPin}
            disabled={pin.length !== 6 || confirmPin.length !== 6}
          >
            Continue
          </PrimaryButton>
        </View>
      ) : null}

      {step === 'complete' ? (
        <View style={[styles.centeredStep, { paddingHorizontal: shellPadding }]}>
          <View style={[styles.successMark, isCompact ? styles.markCompact : null]}>
            <Check color="#FFFFFF" size={40} />
          </View>
          <Text style={styles.completeTitle}>You&apos;re All Set!</Text>
          <Text style={styles.completeText}>
            This device is ready. Sign in with your patient account to load your health records.
          </Text>
          <View style={styles.completeButtonWrap}>
            <PrimaryButton fullWidth size="lg" onPress={() => setOnboardingComplete(true)}>
              Start Using MiqorAI
            </PrimaryButton>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.backLink} onPress={onPress}>
      <ChevronLeft color={colors.textSecondary} size={18} />
      <Text style={styles.backLinkText}>{label}</Text>
    </Pressable>
  )
}

function SecondaryStepper({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string
  icon: React.ReactNode
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable style={[styles.stepperButton, disabled ? styles.stepperButtonDisabled : null]} onPress={onPress} disabled={disabled}>
      {icon}
      <Text style={[styles.stepperText, disabled ? styles.stepperTextDisabled : null]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredStep: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: 560,
  },
  mark: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCompact: {
    width: 78,
    height: 78,
    borderRadius: 24,
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  welcomeTitle: {
    marginTop: spacing.xxxl,
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
  },
  welcomeTitleCompact: {
    fontSize: 30,
  },
  welcomeSubtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 18,
  },
  welcomeSubtitleCompact: {
    fontSize: 16,
  },
  tagline: {
    marginTop: 40,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 36,
  },
  taglineCompact: {
    fontSize: 22,
    lineHeight: 30,
  },
  buttonStack: {
    width: '100%',
    marginTop: 48,
    gap: spacing.lg,
    alignItems: 'center',
  },
  legalText: {
    marginTop: 28,
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalInline: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -10,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  stepShell: {
    flex: 1,
    width: '100%',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    alignSelf: 'center',
  },
  stepTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  featureIconWrapCompact: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  featureTitle: {
    marginTop: 32,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  featureTitleCompact: {
    fontSize: 24,
  },
  featureDescription: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  featureDescriptionCompact: {
    fontSize: 15,
  },
  dotRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D7DDE4',
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.primary,
  },
  featureActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  featureActionsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  stepperButton: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepperButtonDisabled: {
    borderColor: colors.border,
  },
  stepperText: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepperTextDisabled: {
    color: colors.mutedForeground,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -10,
  },
  formGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formGridStacked: {
    flexDirection: 'column',
  },
  formHalf: {
    flex: 1,
  },
  flexSpacer: {
    flex: 1,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pinTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  successMark: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeTitle: {
    marginTop: spacing.xxxl,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  completeText: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  completeButtonWrap: {
    width: '100%',
    marginTop: 48,
  },
})
