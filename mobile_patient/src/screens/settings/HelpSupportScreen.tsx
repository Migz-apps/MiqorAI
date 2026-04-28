import React from 'react'
import { Text, View, Pressable } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { Header, ScreenContainer, PrimaryButton } from '../../components/ui'
import { useTranslation } from '../../i18n'

export function HelpSupportScreen({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation()

    return (
        <ScreenContainer
            header={
                <Header
                    title={t('profile.helpSupport')}
                    leftAction={
                        <Pressable onPress={onBack} className="w-10 h-10 justify-center -ml-[10px]">
                            <ArrowLeft color="var(--color-text-primary)" size={24} />
                        </Pressable>
                    }
                />
            }
        >
            <View className="py-2.5 gap-4">
                <Text className="text-[20px] font-[800] mb-2 text-text-primary">How can we help?</Text>
                <Text className="text-[15px] leading-6 text-text-secondary">
                    If you are experiencing issues with Med-Pass, please check our FAQ or contact our support team.
                </Text>

                <View className="mt-6 gap-3">
                    <PrimaryButton fullWidth variant="outline">Email Support</PrimaryButton>
                    <PrimaryButton fullWidth variant="outline">Visit Help Center</PrimaryButton>
                    <PrimaryButton fullWidth variant="outline">Chat with Support</PrimaryButton>
                </View>
            </View>
        </ScreenContainer>
    )
}
