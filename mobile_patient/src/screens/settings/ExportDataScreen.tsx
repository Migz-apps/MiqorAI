import React from 'react'
import { Text, View, Pressable } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { Header, ScreenContainer, PrimaryButton } from '../../components/ui'
import { useTranslation } from '../../i18n'

export function ExportDataScreen({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation()

    return (
        <ScreenContainer
            header={
                <Header
                    title={t('profile.exportData')}
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
                    You can download a full archive of your health records. This file will be encrypted and can be imported back into MiqorAI or viewed with a compatible reader.
                </Text>
                <View className="mt-6">
                    <PrimaryButton fullWidth>Prepare Export Archive</PrimaryButton>
                </View>
            </View>
        </ScreenContainer>
    )
}
