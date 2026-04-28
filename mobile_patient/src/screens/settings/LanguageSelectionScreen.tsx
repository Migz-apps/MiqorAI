import React from 'react'
import { Text, View, Pressable } from 'react-native'
import { ArrowLeft, Check } from 'lucide-react-native'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { Header, ScreenContainer } from '../../components/ui'
import { usePatientStore } from '../../store'
import { useTranslation } from '../../i18n'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function LanguageSelectionScreen({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation()
    const { language, setLanguage } = usePatientStore()

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'rw', name: 'Kinyarwanda' },
        { code: 'fr', name: 'Français' },
    ]

    return (
        <ScreenContainer
            header={
                <Header
                    title={t('profile.language')}
                    leftAction={
                        <Pressable onPress={onBack} className="w-10 h-10 justify-center -ml-[10px]">
                            <ArrowLeft color="var(--color-text-primary)" size={24} />
                        </Pressable>
                    }
                />
            }
        >
            <View className="mt-2.5">
                {languages.map((lang) => (
                    <Pressable
                        key={lang.code}
                        className={cn(
                            "flex-row justify-between items-center py-[18px] px-1 border-b border-border",
                            language === lang.code ? "bg-primary/10" : ""
                        )}
                        onPress={() => {
                            setLanguage(lang.code as any)
                        }}
                    >
                        <Text className="text-[16px] font-semibold text-text-primary">{lang.name}</Text>
                        {language === lang.code && <Check color="var(--color-primary)" size={20} />}
                    </Pressable>
                ))}
            </View>
        </ScreenContainer>
    )
}
