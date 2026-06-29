import React, { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { Linking } from 'react-native'
import { Header, ScreenContainer, PrimaryButton, useAppToast } from '../../components/ui'
import { useTranslation } from '../../i18n'
import { usePatientStore } from '../../store'

export function ExportDataScreen({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation()
    const { requestExportData } = usePatientStore()
    const { showToast } = useAppToast()
    const [isLoading, setIsLoading] = useState(false)

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
                    <PrimaryButton
                        fullWidth
                        isLoading={isLoading}
                        onPress={async () => {
                            setIsLoading(true)
                            try {
                                const downloadUrl = await requestExportData()
                                await Linking.openURL(downloadUrl)
                                showToast('Your export is ready to download.', 'success')
                            } catch (error) {
                                showToast(error instanceof Error ? error.message : 'Unable to prepare export.', 'error')
                            } finally {
                                setIsLoading(false)
                            }
                        }}
                    >
                        Prepare Export Archive
                    </PrimaryButton>
                </View>
            </View>
        </ScreenContainer>
    )
}
