import * as Clipboard from 'expo-clipboard'
import { LinearGradient } from 'expo-linear-gradient'
import {
    AlertCircle,
    Copy,
} from 'lucide-react-native'
import React from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import {
    InputField,
    PrimaryButton,
    SecondaryButton,
} from '../ui'
import { formatDate } from '../../utils'
import { useResponsive } from '../../responsive'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function ProfileHeaderCard({ patient, isCompact, t }: any) {
    return (
        <LinearGradient
            colors={['#1085A1', '#0D7188']}
            className={cn("rounded-xl p-xxl gap-lg shadow-lg", isCompact ? "p-lg" : "")}
        >
            <View className={cn("w-20 h-20 rounded-full bg-white/20 items-center justify-center", isCompact ? "w-[68px] h-[68px]" : "")}>
                <Text className="text-white text-[28px] font-[900]">
                    {patient?.firstName?.charAt(0)}{patient?.lastName?.charAt(0)}
                </Text>
            </View>

            <View className="gap-1">
                <Text className="text-white text-[24px] font-[800]">{patient?.firstName} {patient?.lastName}</Text>
                <Text className="text-white/90 text-[16px]">{patient?.phoneNumber}</Text>
                <Text className="text-white/70 text-[13px]">{patient?.email || t('profile.noEmail')}</Text>
            </View>

            <View className="flex-row flex-wrap gap-sm">
                {patient?.bloodType && (
                    <View className="rounded-pill bg-white/20 px-md py-2">
                        <Text className="text-white text-[12px] font-semibold">Blood: {patient.bloodType}</Text>
                    </View>
                )}
                <View className="rounded-pill bg-white/20 px-md py-2">
                    <Text className="text-white text-[12px] font-semibold">Member since {patient?.createdAt ? formatDate(patient.createdAt) : 'N/A'}</Text>
                </View>
            </View>
        </LinearGradient>
    )
}

export function SettingRow({
    icon, label, description, onPress, toggle = false, value = false, onToggle, badge, danger = false, last = false, right,
}: any) {
    const { isCompact } = useResponsive()
    return (
        <Pressable
            className={cn("flex-row items-center gap-md p-lg", isCompact ? "items-start" : "", !last ? "border-b border-border" : "")}
            onPress={onPress}
        >
            <View className={cn("w-10 h-10 rounded-md bg-muted items-center justify-center", danger ? "bg-allergy-bg" : "")}>{icon}</View>
            <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-sm flex-wrap">
                    <Text className={cn("text-[15px] font-bold text-text-primary", danger ? "text-error" : "")}>{label}</Text>
                    {badge && (
                        <View className="rounded-pill bg-primary-light px-sm py-1">
                            <Text className="text-primary text-[11px] font-bold">{badge}</Text>
                        </View>
                    )}
                </View>
                {description ? <Text className="text-text-secondary text-[13px] leading-[18px]">{description}</Text> : null}
            </View>
            {right ? right : toggle ? (
                <Switch value={value} onValueChange={onToggle} trackColor={{ true: "var(--color-primary)" }} />
            ) : onPress ? (
                <Text className="text-muted-fg text-[22px] leading-[22px]">{'>'}</Text>
            ) : null}
        </Pressable>
    )
}

export function EditProfileView({ firstName, setFirstName, lastName, setLastName, phone, setPhone, email, setEmail, onSave, onCancel, isLargePhone, stackedActions }: any) {
    return (
        <View className="gap-lg pb-md">
            <View className={cn("flex-row gap-md", !isLargePhone ? "flex-col" : "")}>
                <View className="flex-1">
                    <InputField label="First Name" value={firstName} onChangeText={setFirstName} />
                </View>
                <View className="flex-1">
                    <InputField label="Last Name" value={lastName} onChangeText={setLastName} />
                </View>
            </View>
            <InputField label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <InputField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <View className={cn("flex-row gap-md", stackedActions ? "flex-col" : "")}>
                <SecondaryButton fullWidth onPress={onCancel}>Cancel</SecondaryButton>
                <PrimaryButton fullWidth onPress={onSave}>Save Changes</PrimaryButton>
            </View>
        </View>
    )
}

export function RecoveryPhraseView({ phrase, onCopy, onConfirm, cellWidth }: any) {
    return (
        <View className="gap-lg pb-md">
            <View className="rounded-lg bg-allergy-bg border border-border p-lg flex-row gap-md items-start">
                <AlertCircle color="var(--color-error)" size={18} />
                <View className="flex-1 gap-1">
                    <Text className="text-error text-[15px] font-[800]">Keep this secret!</Text>
                    <Text className="text-error text-[13px] leading-5">Anyone with these words can access your account. Never share them with anyone.</Text>
                </View>
            </View>
            <View className="flex-row flex-wrap gap-sm">
                {phrase.map((word: string, index: number) => (
                    <View key={word} style={{ width: cellWidth }} className="rounded-md border border-border bg-muted py-md items-center">
                        <Text className="text-muted-fg text-[11px]">{index + 1}.</Text>
                        <Text className="text-text-primary font-bold mt-0.5">{word}</Text>
                    </View>
                ))}
            </View>
            <PrimaryButton fullWidth variant="ghost" leftIcon={<Copy color="var(--color-text-primary)" size={16} />} onPress={() => Clipboard.setStringAsync(phrase.join(' '))}>
                Copy to Clipboard
            </PrimaryButton>
            <PrimaryButton fullWidth onPress={onConfirm}>I&apos;ve Written It Down</PrimaryButton>
        </View>
    )
}
