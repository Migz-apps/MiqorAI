import React from 'react'
import { Text, View } from 'react-native'
import { PrimaryButton } from '../ui'

export function DetailRow({ label, value }: { label: string; value?: string }) {
    if (!value) {
        return null
    }

    return (
        <View className="border-b border-border pb-sm gap-1.5">
            <Text className="text-text-secondary text-[13px] font-semibold">{label}</Text>
            <Text className="text-text-primary text-[15px] font-semibold">{value}</Text>
        </View>
    )
}

export function SecondaryAction({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress?: () => void }) {
    return (
        <PrimaryButton fullWidth variant="outline" leftIcon={icon} onPress={onPress}>
            {label}
        </PrimaryButton>
    )
}
