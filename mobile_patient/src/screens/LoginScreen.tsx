import {
    Fingerprint,
    Lock,
    Mail,
} from 'lucide-react-native'
import React, { useState } from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import {
    InputField,
    PrimaryButton,
    TextButton,
} from '../components/ui'
import { useResponsive } from '../responsive'
import { usePatientStore } from '../store'
import { useTranslation } from '../i18n'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface LoginScreenProps {
    onNavigateToSignup?: () => void
}

export function LoginScreen({ onNavigateToSignup }: LoginScreenProps) {
    const { login, biometricsEnabled } = usePatientStore()
    const { isCompact, horizontalPadding, contentMaxWidth } = useResponsive()
    const { t } = useTranslation()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            await login({ email, password })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleBiometricLogin = async () => {
        setError('Please sign in with your email and password first on this device.')
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ paddingHorizontal: horizontalPadding }} className="flex-1 justify-center items-center">
                        <View style={{ maxWidth: contentMaxWidth }} className="w-full py-xxl gap-xl">
                            {/* Header section */}
                            <View className="items-center gap-sm">
                                <View className="w-[72px] h-[72px] rounded-[22px] bg-primary items-center justify-center mb-md">
                                    <Text className="text-white text-[28px] font-[900]">M+</Text>
                                </View>
                                <Text className={cn("text-[32px] font-[800] text-center text-text-primary", isCompact ? "text-[28px]" : "")}>
                                    Welcome Back
                                </Text>
                                <Text className="text-[16px] text-center leading-[22px] text-text-secondary">
                                    Sign in to access your secure health records
                                </Text>
                            </View>

                            {/* Form section */}
                            <View className="gap-md">
                                <InputField
                                    label="Email Address"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text)
                                        setError('')
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    leftIcon={<Mail color="var(--color-text-secondary)" size={20} />}
                                />

                                <View className="relative">
                                    <InputField
                                        label="Password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text)
                                            setError('')
                                        }}
                                        secureTextEntry
                                        leftIcon={<Lock color="var(--color-text-secondary)" size={20} />}
                                    />
                                    <Pressable className="absolute top-0 right-0 h-5 justify-center">
                                        <Text className="text-[13px] font-bold text-primary">
                                            Forgot Password?
                                        </Text>
                                    </Pressable>
                                </View>

                                {error ? (
                                    <Text className="text-error text-[13px] font-semibold text-center">{error}</Text>
                                ) : null}

                                <PrimaryButton
                                    fullWidth
                                    size="lg"
                                    onPress={handleLogin}
                                    isLoading={isLoading}
                                    className="mt-sm"
                                >
                                    Sign In
                                </PrimaryButton>

                                {biometricsEnabled && (
                                    <Pressable className="items-center gap-xs mt-md" onPress={handleBiometricLogin}>
                                        <View className="w-14 h-14 rounded-md border border-border items-center justify-center">
                                            <Fingerprint color="var(--color-primary)" size={28} />
                                        </View>
                                        <Text className="text-text-secondary text-[14px] font-semibold">
                                            Sign in with Biometrics
                                        </Text>
                                    </Pressable>
                                )}
                            </View>

                            {/* Social Login Section */}
                            <View className="gap-lg">
                                <View className="flex-row items-center gap-md">
                                    <View className="flex-1 h-[1px] bg-border" />
                                    <Text className="text-muted-fg text-[13px] font-semibold">
                                        Or continue with
                                    </Text>
                                    <View className="flex-1 h-[1px] bg-border" />
                                </View>

                                <View className="flex-row gap-md">
                                    <Pressable className="flex-1 h-[52px] rounded-md border border-border bg-card items-center justify-center">
                                        <Text className="text-text-primary text-[15px] font-bold">Google</Text>
                                    </Pressable>
                                    <Pressable className="flex-1 h-[52px] rounded-md border border-border bg-card items-center justify-center">
                                        <Text className="text-text-primary text-[15px] font-bold">Apple</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {onNavigateToSignup ? (
                                <View className="flex-row justify-center items-center mt-md">
                                    <Text className="text-text-secondary text-[15px]">
                                        Don't have an account?{' '}
                                    </Text>
                                    <TextButton onPress={onNavigateToSignup}>
                                        Sign Up
                                    </TextButton>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
