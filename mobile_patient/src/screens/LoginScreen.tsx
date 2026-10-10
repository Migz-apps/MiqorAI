import { Lock, Mail } from 'lucide-react-native'
import React, { useState } from 'react'
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { InputField, PrimaryButton, TextButton } from '../components/ui'
import { mobileApi } from '../lib/api'
import { useResponsive } from '../responsive'
import { usePatientStore } from '../store'
import { colors, radius, spacing } from '../theme'

interface LoginScreenProps {
    onNavigateToSignup?: () => void
}

export function LoginScreen({ onNavigateToSignup }: LoginScreenProps) {
    const login = usePatientStore((s) => s.login)
    const { isCompact, horizontalPadding, contentMaxWidth } = useResponsive()

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

    const handleForgotPassword = () => {
        Alert.alert(
            'Reset your password',
            'Password reset is available on the MiqorAI patient web portal. Sign in there with your email to receive a reset code.',
        )
    }

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.center, { paddingHorizontal: horizontalPadding }]}>
                        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
                            <View style={styles.header}>
                                <View style={styles.logo}>
                                    <Text style={styles.logoText}>M+</Text>
                                </View>
                                <Text style={[styles.title, isCompact && styles.titleCompact]}>
                                    Welcome Back
                                </Text>
                                <Text style={styles.subtitle}>
                                    Sign in to access your secure health records
                                </Text>
                            </View>

                            <View style={styles.form}>
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
                                    leftIcon={<Mail color={colors.textSecondary} size={20} />}
                                />

                                <View>
                                    <InputField
                                        label="Password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text)
                                            setError('')
                                        }}
                                        secureTextEntry
                                        leftIcon={<Lock color={colors.textSecondary} size={20} />}
                                    />
                                    <Pressable style={styles.forgot} onPress={handleForgotPassword}>
                                        <Text style={styles.forgotText}>Forgot Password?</Text>
                                    </Pressable>
                                </View>

                                {error ? <Text style={styles.error}>{error}</Text> : null}

                                <PrimaryButton
                                    fullWidth
                                    size="lg"
                                    onPress={handleLogin}
                                    isLoading={isLoading}
                                >
                                    Sign In
                                </PrimaryButton>
                            </View>

                            {onNavigateToSignup ? (
                                <View style={styles.signupRow}>
                                    <Text style={styles.signupText}>
                                        {"Don't have an account? "}
                                    </Text>
                                    <TextButton onPress={onNavigateToSignup}>Sign Up</TextButton>
                                </View>
                            ) : null}

                            {__DEV__ ? (
                                <View style={styles.devBox}>
                                    <Text style={styles.devTitle}>Dev API: {mobileApi.apiUrl}</Text>
                                    <Text style={styles.devBody}>
                                        Production defaults to the deployed backend. For local phone testing, set
                                        EXPO_PUBLIC_API_URL to your computer hotspot IP and keep the backend on port
                                        3000.
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { width: '100%', paddingVertical: spacing.xl, gap: spacing.xl },
    header: { alignItems: 'center', gap: spacing.sm },
    logo: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    logoText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
    title: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: colors.textPrimary },
    titleCompact: { fontSize: 28 },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        color: colors.textSecondary,
    },
    form: { gap: spacing.md },
    forgot: { position: 'absolute', top: 0, right: 0, height: 20, justifyContent: 'center' },
    forgotText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    error: { color: colors.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    signupText: { color: colors.textSecondary, fontSize: 15 },
    devBox: {
        marginTop: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    devTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    devBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 4 },
})
