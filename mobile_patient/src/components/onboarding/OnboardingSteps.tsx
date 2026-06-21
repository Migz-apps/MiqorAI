import {
    AlertTriangle,
    ArrowLeft,
    Check,
    ChevronRight,
    Eye,
    Fingerprint,
    KeyRound,
    Lock,
} from 'lucide-react-native'
import React from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import {
    CheckboxField,
    InputField,
    PrimaryButton,
    TextButton,
    PinInput,
} from '../ui'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function WelcomeStep({ onNext, onLogin, onRestore, isCompact }: any) {
    return (
        <View className="flex-1 w-full items-center justify-center self-center" style={{ maxWidth: 560 }}>
            <View className={cn("w-24 h-24 rounded-[30px] bg-primary items-center justify-center", isCompact ? "w-[78px] h-[78px] rounded-3xl" : "")}>
                <Text className="text-white text-[32px] font-[900]">M+</Text>
            </View>
            <Text className={cn("mt-xxxl text-text-primary text-[34px] font-[900]", isCompact ? "text-[30px]" : "")}>MiqorAI</Text>
            <Text className={cn("mt-sm text-text-secondary text-[18px]", isCompact ? "text-[16px]" : "")}>Patient Portal</Text>
            <Text className={cn("mt-10 text-text-primary text-[26px] font-medium text-center leading-9", isCompact ? "text-[22px] leading-[30px]" : "")}>
                Your health records.{"\n"}In your pocket.{"\n"}Always.
            </Text>

            <View style={{ maxWidth: 420 }} className="w-full mt-12 gap-md items-center">
                <PrimaryButton fullWidth size="lg" onPress={onNext}>Get Started</PrimaryButton>
                <View className="flex-row items-center">
                    <Text className="text-[15px] text-text-secondary">Already have an account? </Text>
                    <TextButton onPress={onLogin}>Sign In</TextButton>
                </View>
                <TextButton onPress={onRestore}>Restore from Backup</TextButton>
            </View>

            <Text className="mt-7 text-muted-fg text-[12px] leading-[18px] text-center">
                By continuing, you agree to our Terms and Privacy Policy.
            </Text>
        </View>
    )
}

export function FeaturesStep({ features, activeIndex, setIndex, onNext, onBack, onSkip, isCompact, stackedActions }: any) {
    const activeFeature = features[activeIndex]
    return (
        <View className="flex-1 w-full pt-lg pb-xxl gap-xl self-center" style={{ maxWidth: 560 }}>
            <View className="flex-row justify-between items-center">
                <Pressable onPress={onBack} className="w-11 h-11 justify-center -ml-sm">
                    <ArrowLeft color="var(--color-text-primary)" size={24} />
                </Pressable>
                <TextButton onPress={onSkip}>Skip</TextButton>
            </View>

            <View style={{ maxWidth: 460 }} className="flex-1 items-center justify-center self-center">
                <View className={cn("w-24 h-24 rounded-full items-center justify-center bg-primary-light", isCompact ? "w-[78px] h-[78px]" : "")}>
                    <activeFeature.icon color="var(--color-primary)" size={44} />
                </View>
                <Text className={cn("mt-8 text-text-primary text-[28px] font-[800] text-center", isCompact ? "text-[24px]" : "")}>{activeFeature.title}</Text>
                <Text className={cn("mt-lg text-text-secondary text-[16px] leading-[24px] text-center", isCompact ? "text-[15px]" : "")}>{activeFeature.description}</Text>
            </View>

            <View className="flex-row self-center gap-sm mb-lg">
                {features.map((_: any, index: number) => (
                    <Pressable key={index} onPress={() => setIndex(index)} className={cn("w-2 h-2 rounded-full bg-[#D7DDE4]", index === activeIndex ? "w-8 bg-primary" : "")} />
                ))}
            </View>

            <View style={{ maxWidth: 420 }} className={cn("flex-row gap-md items-center w-full self-center", stackedActions ? "flex-col items-stretch" : "")}>
                <PrimaryButton fullWidth onPress={onNext} rightIcon={<ChevronRight color="#FFFFFF" size={18} />}>
                    {activeIndex === features.length - 1 ? 'Create Account' : 'Next'}
                </PrimaryButton>
            </View>
        </View>
    )
}

export function CreateProfileStep({ firstName, setFirstName, lastName, setLastName, email, setEmail, phoneNumber, setPhoneNumber, acceptedTerms, setAcceptedTerms, onNext, onBack, isLargePhone }: any) {
    return (
        <View className="flex-1 w-full pt-lg pb-xxl gap-xl self-center" style={{ maxWidth: 560 }}>
            <View className="flex-row justify-between items-center">
                <Pressable onPress={onBack} className="w-11 h-11 justify-center -ml-sm">
                    <ArrowLeft color="var(--color-text-primary)" size={24} />
                </Pressable>
            </View>
            <Text className="text-text-primary text-[28px] font-[800]">Create Your Profile</Text>
            <Text className="text-text-secondary text-[15px] leading-[22px] -mt-2.5">
                This information will be stored securely on your device.
            </Text>

            <View className={cn("flex-row gap-md", !isLargePhone ? "flex-col" : "")}>
                <View className="flex-1">
                    <InputField label="First Name" placeholder="Jean" value={firstName} onChangeText={setFirstName} />
                </View>
                <View className="flex-1">
                    <InputField label="Last Name" placeholder="Mugisha" value={lastName} onChangeText={setLastName} />
                </View>
            </View>

            <InputField label="Email Address" placeholder="jean.mugisha@email.com" value={email} keyboardType="email-address" onChangeText={setEmail} />
            <InputField label="Phone Number" placeholder="+250 788 123 456" value={phoneNumber} keyboardType="phone-pad" onChangeText={setPhoneNumber} />

            <CheckboxField label="I agree to the Terms of Service and Privacy Policy" checked={acceptedTerms} onChange={setAcceptedTerms} />

            <View className="mt-xl gap-md">
                <Text className="text-text-secondary text-[13px] text-center">Or sign up with</Text>
                <View className="flex-row gap-md">
                    <Pressable className="flex-1 h-[50px] rounded-md border border-border items-center justify-center bg-card"><Text className="text-text-primary font-bold text-[14px]">Google</Text></Pressable>
                    <Pressable className="flex-1 h-[50px] rounded-md border border-border items-center justify-center bg-card"><Text className="text-text-primary font-bold text-[14px]">Apple</Text></Pressable>
                </View>
            </View>

            <View className="flex-1" />
            <PrimaryButton fullWidth size="lg" onPress={onNext} disabled={!firstName || !lastName || !email || !phoneNumber || !acceptedTerms}>Continue</PrimaryButton>
        </View>
    )
}

export function RecoveryStep({ words, showPhrase, setShowPhrase, copied, onCopy, onNext, onBack, phraseCellWidth }: any) {
    return (
        <View className="flex-1 w-full pt-lg pb-xxl gap-xl self-center" style={{ maxWidth: 560 }}>
            <View className="flex-row justify-between items-center">
                <Pressable onPress={onBack} className="w-11 h-11 justify-center -ml-sm"><ArrowLeft color="var(--color-text-primary)" size={24} /></Pressable>
            </View>
            <View className="flex-row items-center gap-sm">
                <KeyRound color="var(--color-primary)" size={24} />
                <Text className="text-text-primary text-[28px] font-[800]">Recovery Phrase</Text>
            </View>

            <View className="rounded-lg bg-allergy-bg border border-[#F3B6B1] p-lg flex-row gap-md items-start">
                <AlertTriangle color="var(--color-error)" size={20} />
                <View className="flex-1 gap-1">
                    <Text className="text-error text-[15px] font-[800]">Write these words down!</Text>
                    <Text className="text-error text-[13px] leading-5">Without this phrase, no one can recover your records if you lose access.</Text>
                </View>
            </View>

            <View className="relative">
                {!showPhrase ? (
                    <Pressable className="absolute inset-0 rounded-lg bg-[#1A2B3D]/48 z-[2] items-center justify-center flex-row gap-sm" onPress={() => setShowPhrase(true)}>
                        <Eye color="#FFFFFF" size={18} /><Text className="text-white font-bold">Reveal Phrase</Text>
                    </Pressable>
                ) : null}

                <View className="flex-row flex-wrap gap-sm">
                    {words.map((word: string, index: number) => (
                        <View key={word} style={{ width: phraseCellWidth }} className="flex-row items-center gap-1.5 p-sm bg-muted rounded-md">
                            <Text className="text-muted-fg text-[11px] font-bold min-w-[16px]">{index + 1}.</Text>
                            <Text className="text-text-primary text-[14px] font-[800]">{showPhrase ? word : '****'}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {showPhrase ? <PrimaryButton variant="ghost" fullWidth onPress={onCopy}>{copied ? 'Copied!' : 'Copy to Clipboard'}</PrimaryButton> : null}
            <View className="flex-1" />
            <PrimaryButton fullWidth size="lg" onPress={onNext} disabled={!showPhrase}>I&apos;ve Written It Down</PrimaryButton>
        </View>
    )
}

export function ConfirmRecoveryStep({ confirmIndices, confirmWords, setConfirmWords, confirmError, setConfirmError, onNext, onBack }: any) {
    return (
        <View className="flex-1 w-full pt-lg pb-xxl gap-xl self-center" style={{ maxWidth: 560 }}>
            <View className="flex-row justify-between items-center">
                <Pressable onPress={onBack} className="w-11 h-11 justify-center -ml-sm"><ArrowLeft color="var(--color-text-primary)" size={24} /></Pressable>
            </View>
            <Text className="text-text-primary text-[28px] font-[800]">Confirm Your Phrase</Text>
            <Text className="text-text-secondary text-[15px] leading-[22px] -mt-2.5">Enter the following words from your recovery phrase.</Text>

            {confirmIndices.map((wordIndex: number, index: number) => (
                <InputField
                    key={wordIndex}
                    label={`Word #${wordIndex + 1}`}
                    placeholder={`Enter word ${wordIndex + 1}`}
                    value={confirmWords[index]}
                    onChangeText={(value: string) => {
                        setConfirmWords((current: string[]) => current.map((entry, wordPosition) => (wordPosition === index ? value : entry)))
                        setConfirmError('')
                    }}
                />
            ))}

            {confirmError ? <Text className="text-error text-[14px] font-semibold">{confirmError}</Text> : null}

            <View className="flex-1" />
            <PrimaryButton fullWidth size="lg" onPress={onNext} disabled={confirmWords.some((word: string) => !word.trim())}>Verify</PrimaryButton>
        </View>
    )
}

export function SecurityStep({ enableBiometrics, setEnableBiometrics, pin, setPin, confirmPin, setConfirmPin, pinError, onNext, onBack, isCompact }: any) {
    return (
        <View className="flex-1 w-full pt-lg pb-xxl gap-xl self-center" style={{ maxWidth: 560 }}>
            <View className="flex-row justify-between items-center">
                <Pressable onPress={onBack} className="w-11 h-11 justify-center -ml-sm"><ArrowLeft color="var(--color-text-primary)" size={24} /></Pressable>
            </View>
            <View className="flex-row items-center gap-sm">
                <Lock color="var(--color-primary)" size={24} /><Text className="text-text-primary text-[28px] font-[800]">Secure Your Account</Text>
            </View>

            <View className={cn("flex-row items-center gap-md p-lg rounded-lg border border-border bg-card", isCompact ? "p-md" : "")}>
                <View className="w-11 h-11 rounded-full bg-primary-light items-center justify-center"><Fingerprint color="var(--color-primary)" size={26} /></View>
                <View className="flex-1 gap-0.5">
                    <Text className="text-text-primary text-[16px] font-bold">Biometric Login</Text>
                    <Text className="text-text-secondary text-[13px]">Use fingerprint or Face ID</Text>
                </View>
                <Switch value={enableBiometrics} onValueChange={setEnableBiometrics} trackColor={{ true: "var(--color-primary)" }} />
            </View>

            <Text className="text-text-primary text-[15px] font-bold">Create a 6-digit PIN</Text>
            <PinInput value={pin} onChange={setPin} />

            {pin.length === 6 ? (
                <>
                    <Text className="text-text-primary text-[15px] font-bold">Confirm PIN</Text>
                    <PinInput value={confirmPin} onChange={setConfirmPin} error={pinError} />
                </>
            ) : null}

            <View className="flex-1" />
            <PrimaryButton fullWidth size="lg" onPress={onNext} disabled={pin.length !== 6 || confirmPin.length !== 6}>Continue</PrimaryButton>
        </View>
    )
}

export function CompleteStep({ onComplete, isLoading, isCompact }: any) {
    return (
        <View className="flex-1 w-full items-center justify-center self-center" style={{ maxWidth: 560 }}>
            <View className={cn("w-24 h-24 rounded-[30px] bg-success items-center justify-center", isCompact ? "w-[78px] h-[78px] rounded-3xl" : "")}>
                <Check color="#FFFFFF" size={40} />
            </View>
            <Text className="mt-xxxl text-text-primary text-[34px] font-[900]">You&apos;re All Set!</Text>
            <Text className="mt-md text-text-secondary text-[16px] leading-[24px] text-center">
                Your MiqorAI account is ready. Your health records are now secure and always with you.
            </Text>
            <View className="mt-xxxl w-full">
                <PrimaryButton fullWidth size="lg" onPress={onComplete} isLoading={isLoading}>Start Using MiqorAI</PrimaryButton>
            </View>
        </View>
    )
}
