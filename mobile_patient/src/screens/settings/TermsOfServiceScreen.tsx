import React from 'react'
import { Text, View, Pressable } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { Header, ScreenContainer } from '../../components/ui'
import { useTranslation } from '../../i18n'

export function TermsOfServiceScreen({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation()

    return (
        <ScreenContainer
            header={
                <Header
                    title={t('profile.termsOfService')}
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
                    Last updated: April 27, 2026{"\n\n"}
                    Welcome to MiqorAI. By using our application, you agree to the following terms and conditions. MiqorAI is a patient-controlled medical record platform designed to enhance your health data portability and security.{"\n\n"}
                    1. Data Ownership: You own all health records stored on your device. MiqorAI does not host your records on central servers; we provide the encryption and synchronization infrastructure.{"\n\n"}
                    2. Security: You are responsible for maintaining the confidentiality of your recovery phrase and PIN. MiqorAI cannot recover your account if you lose these.{"\n\n"}
                    3. Privacy: We comply with GDPR and local Rwanda health data regulations. We do not sell or share your data with third parties without your explicit consent.{"\n\n"}
                    4. Professional Medical Advice: MiqorAI is a data management tool and not a substitute for professional medical advice, diagnosis, or treatment.
                </Text>
            </View>
        </ScreenContainer>
    )
}
