import * as Clipboard from 'expo-clipboard'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Fingerprint,
  KeyRound,
  Lock,
  QrCode,
  Shield,
  Users,
} from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  CheckboxField,
  InputField,
  LoadingOverlay,
  OptionCards,
  PinInput,
  PrimaryButton,
  TextButton,
} from '../components/ui'
import { useResponsive } from '../responsive'
import { usePatientStore } from '../store'
import { colors, radius, spacing } from '../theme'

type OnboardingStep = 'welcome' | 'features' | 'create' | 'recovery' | 'confirm' | 'biometrics' | 'complete'

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
    title: 'Bank-Level Security',
    description: 'Your data is encrypted with the same technology that protects financial institutions.',
  },
]

const recoveryWords = [
  'apple',
  'banana',
  'cherry',
  'diamond',
  'eagle',
  'forest',
  'garden',
  'harbor',
  'island',
  'jungle',
  'kingdom',
  'lighthouse',
]

export function OnboardingScreen() {
  const { setAuthenticated, setBiometricsEnabled, setOnboardingComplete, loadMockData } = usePatientStore()
  const { isCompact, isLargePhone, isTablet, recoveryColumns, stackedActions, horizontalPadding, contentMaxWidth } = useResponsive()
  const shellPadding = horizontalPadding + (isTablet ? spacing.xl : spacing.md)
  const stepMaxWidth = Math.min(contentMaxWidth, 560)
  const phraseCellWidth = recoveryColumns === 4 ? '23.5%' : recoveryColumns === 3 ? '31.4%' : '48.2%'

  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [featureIndex, setFeatureIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPhrase, setShowPhrase] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmWords, setConfirmWords] = useState(['', '', ''])
  const [confirmError, setConfirmError] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [enableBiometrics, setEnableBiometricsState] = useState(true)

  const confirmIndices = useMemo(() => [2, 6, 10], [])
  const activeFeature = features[featureIndex]

  const handleCreate = async () => {
    if (!firstName || !lastName || !phoneNumber || !acceptedTerms) {
      return
    }

    setIsGeneratingKeys(true)
    await new Promise((resolve) => setTimeout(resolve, 1800))
    setIsGeneratingKeys(false)
    setStep('recovery')
  }

  const handleCopyPhrase = async () => {
    await Clipboard.setStringAsync(recoveryWords.join(' '))
    setCopied(true)
  }

  const handleConfirmRecovery = () => {
    const valid = confirmIndices.every(
      (index, wordIndex) =>
        recoveryWords[index].toLowerCase() === confirmWords[wordIndex].trim().toLowerCase(),
    )

    if (!valid) {
      setConfirmError("The words you entered don't match. Please try again.")
      return
    }

    setConfirmError('')
    setStep('biometrics')
  }

  const handlePin = () => {
    if (pin.length !== 6) {
      setPinError('PIN must be 6 digits')
      return
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }

    setPinError('')
    setBiometricsEnabled(enableBiometrics)
    setStep('complete')
  }

  const handleComplete = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    loadMockData()
    setOnboardingComplete(true)
    setAuthenticated(true)
  }

  const handleRestore = () => {
    loadMockData()
    setOnboardingComplete(true)
    setAuthenticated(true)
  }

  if (isGeneratingKeys) {
    return <LoadingOverlay fullScreen message="Generating your secure keys..." />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {step === 'welcome' ? (
        <View style={[styles.centeredStep, { paddingHorizontal: shellPadding }]}>
          <View style={[styles.mark, isCompact ? styles.markCompact : null]}>
            <Text style={styles.markText}>M+</Text>
          </View>
          <Text style={[styles.welcomeTitle, isCompact ? styles.welcomeTitleCompact : null]}>Med-Pass</Text>
          <Text style={[styles.welcomeSubtitle, isCompact ? styles.welcomeSubtitleCompact : null]}>Patient Portal</Text>
          <Text style={[styles.tagline, isCompact ? styles.taglineCompact : null]}>Your health records.{"\n"}In your pocket.{"\n"}Always.</Text>

          <View style={[styles.buttonStack, { maxWidth: Math.min(stepMaxWidth, 420) }]}>
            <PrimaryButton fullWidth size="lg" onPress={() => setStep('features')}>
              Get Started
            </PrimaryButton>
            <TextButton onPress={handleRestore}>Restore from Backup</TextButton>
          </View>

          <Text style={styles.legalText}>
            By continuing, you agree to our Terms and Privacy Policy.
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
          <Text style={styles.stepSubtitle}>This information will be stored securely on your device.</Text>

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

          <View style={styles.flexSpacer} />

          <PrimaryButton
            fullWidth
            size="lg"
            onPress={handleCreate}
            disabled={!firstName || !lastName || !phoneNumber || !acceptedTerms}
          >
            Continue
          </PrimaryButton>
        </View>
      ) : null}

      {step === 'recovery' ? (
        <View style={[styles.stepShell, { paddingHorizontal: shellPadding, maxWidth: stepMaxWidth }]}>
          <View style={styles.sheetTitleRow}>
            <KeyRound color={colors.primary} size={24} />
            <Text style={styles.stepTitle}>Recovery Phrase</Text>
          </View>

          <View style={styles.warningCard}>
            <AlertTriangle color={colors.error} size={20} />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>Write these words down!</Text>
              <Text style={styles.warningText}>
                Without this phrase, no one can recover your records if you lose access.
              </Text>
            </View>
          </View>

          <View style={styles.phraseWrap}>
            {!showPhrase ? (
              <Pressable style={styles.revealOverlay} onPress={() => setShowPhrase(true)}>
                <Eye color="#FFFFFF" size={18} />
                <Text style={styles.revealText}>Reveal Phrase</Text>
              </Pressable>
            ) : null}

            <View style={styles.phraseGrid}>
              {recoveryWords.map((word, index) => (
              <View
                key={word}
                style={[
                  styles.phraseCell,
                  { width: phraseCellWidth },
                ]}
              >
                  <Text style={styles.phraseIndex}>{index + 1}.</Text>
                  <Text style={styles.phraseWord}>{showPhrase ? word : '****'}</Text>
                </View>
              ))}
            </View>
          </View>

          {showPhrase ? (
            <PrimaryButton variant="ghost" fullWidth onPress={handleCopyPhrase}>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </PrimaryButton>
          ) : null}

          <View style={styles.flexSpacer} />

          <PrimaryButton fullWidth size="lg" onPress={() => setStep('confirm')} disabled={!showPhrase}>
            I&apos;ve Written It Down
          </PrimaryButton>
        </View>
      ) : null}

      {step === 'confirm' ? (
        <View style={[styles.stepShell, { paddingHorizontal: shellPadding, maxWidth: stepMaxWidth }]}>
          <BackLink label="Back" onPress={() => setStep('recovery')} />
          <Text style={styles.stepTitle}>Confirm Your Phrase</Text>
          <Text style={styles.stepSubtitle}>Enter the following words from your recovery phrase.</Text>

          {confirmIndices.map((wordIndex, index) => (
            <InputField
              key={wordIndex}
              label={`Word #${wordIndex + 1}`}
              placeholder={`Enter word ${wordIndex + 1}`}
              value={confirmWords[index]}
              onChangeText={(value) => {
                setConfirmWords((current) => current.map((entry, wordPosition) => (wordPosition === index ? value : entry)))
                setConfirmError('')
              }}
            />
          ))}

          {confirmError ? <Text style={styles.inlineError}>{confirmError}</Text> : null}

          <View style={styles.flexSpacer} />

          <PrimaryButton
            fullWidth
            size="lg"
            onPress={handleConfirmRecovery}
            disabled={confirmWords.some((word) => !word.trim())}
          >
            Verify
          </PrimaryButton>
        </View>
      ) : null}

      {step === 'biometrics' ? (
        <View style={[styles.stepShell, { paddingHorizontal: shellPadding, maxWidth: stepMaxWidth }]}>
          <View style={styles.sheetTitleRow}>
            <Lock color={colors.primary} size={24} />
            <Text style={styles.stepTitle}>Secure Your Account</Text>
          </View>

          <View style={[styles.securityCard, isCompact ? styles.securityCardCompact : null]}>
            <View style={styles.securityIcon}>
              <Fingerprint color={colors.primary} size={26} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Biometric Login</Text>
              <Text style={styles.securityDescription}>Use fingerprint or Face ID</Text>
            </View>
            <Switch value={enableBiometrics} onValueChange={setEnableBiometricsState} trackColor={{ true: colors.primary }} />
          </View>

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
            Your Med-Pass account is ready. Your health records are now secure and always with you.
          </Text>
          <View style={styles.completeButtonWrap}>
            <PrimaryButton fullWidth size="lg" onPress={handleComplete} isLoading={isLoading}>
              Start Using Med-Pass
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
  warningCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.allergyBg,
    borderWidth: 1,
    borderColor: '#F3B6B1',
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  warningCopy: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '800',
  },
  warningText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 20,
  },
  phraseWrap: {
    position: 'relative',
  },
  revealOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(26,43,60,0.48)',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  revealText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  phraseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  phraseCell: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  phraseIndex: {
    color: colors.mutedForeground,
    fontSize: 11,
  },
  phraseWord: {
    marginTop: 3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  inlineError: {
    color: colors.error,
    fontSize: 13,
  },
  securityCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  securityCardCompact: {
    alignItems: 'flex-start',
  },
  securityIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCopy: {
    flex: 1,
  },
  securityTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  securityDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
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
