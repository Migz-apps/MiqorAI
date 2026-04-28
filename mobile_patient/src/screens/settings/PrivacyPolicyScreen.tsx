import React from 'react'
import { Text, View, Pressable } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { Header, ScreenContainer } from '../../components/ui'
import { useTranslation } from '../../i18n'

export function PrivacyPolicyScreen({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation()

    return (
        <ScreenContainer
            header={
                <Header
                    title={t('profile.privacyPolicy')}
                    leftAction={
                        <Pressable onPress={onBack} className="w-10 h-10 justify-center -ml-[10px]">
                            <ArrowLeft color="var(--color-text-primary)" size={24} />
                        </Pressable>
                    }
                />
            }
        >
            <View className="py-2.5 gap-4">
                <Text className="text-[15px] leading-6 text-text-primary">
                    Your privacy is our priority. Med-Pass is built on the principle of local-first data storage.{"\n\n"}
                    - Data Minimization: We only collect the necessary metadata to facilitate peer-to-peer data sharing.{"\n\n"}
                    - Encryption: All medical records are encrypted using AES-256 before being stored or transmitted. Only you hold the decryption keys.{"\n\n"}
                    - Consent Tracking: Every access to your records by a healthcare provider is logged and requires your explicit QR code scan or authorization.{"\n\n"}
                    - Right to Erasure: You can delete all your data at any time from the account settings.
                </Text>
            </View>
        </ScreenContainer>
    )
}
