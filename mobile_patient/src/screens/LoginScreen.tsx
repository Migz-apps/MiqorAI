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
import { useTranslation } from '../i18n'
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
    const { t } = useTranslation()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async () => {
        if (!email || !password) {
            setError(t('login.missingFields'))
            return
        }

        setIsLoading(true)
        setError('')

        try {
            await login({ email, password })
        } catch (err) {
            setError(err instanceof Error ? err.message : t('login.invalidCredentials'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleForgotPassword = () => {
        Alert.alert(t('login.resetTitle'), t('login.resetMessage'))
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
                                    {t('login.title')}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {t('login.subtitle')}
                                </Text>
                            </View>

                            <View style={styles.form}>
                                <InputField
                                    label={t('login.emailLabel')}
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
                                        label={t('login.passwordLabel')}
                                        placeholder={t('login.passwordPlaceholder')}
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text)
                                            setError('')
                                        }}
                                        secureTextEntry
                                        leftIcon={<Lock color={colors.textSecondary} size={20} />}
                                    />
                                    <Pressable
                                        style={styles.forgot}
                                        onPress={handleForgotPassword}
                                        hitSlop={12}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('login.forgotPassword')}
                                        accessibilityHint={t('login.forgotPasswordHint')}
                                    >
                                        <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
                                    </Pressable>
                                </View>

                                {error ? (
                                    <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
                                        {error}
                                    </Text>
                                ) : null}

                                <PrimaryButton
                                    fullWidth
                                    size="lg"
                                    onPress={handleLogin}
                                    isLoading={isLoading}
                                >
                                    {t('login.signIn')}
                                </PrimaryButton>
                            </View>

                            {onNavigateToSignup ? (
                                <View style={styles.signupRow}>
                                    <Text style={styles.signupText}>
                                        {t('login.noAccount')}
                                    </Text>
                                    <TextButton onPress={onNavigateToSignup}>{t('common.signup')}</TextButton>
                                </View>
                            ) : null}

                            {__DEV__ ? (
                                <View style={styles.devBox}>
                                    <Text style={styles.devTitle}>{t('login.devApi', { url: mobileApi.apiUrl })}</Text>
                                    <Text style={styles.devBody}>{t('login.devHelp')}</Text>
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
