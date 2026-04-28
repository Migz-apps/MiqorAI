import {
    AlertCircle,
    Building2,
    Clock3,
    Eye,
    Plus,
    QrCode,
} from 'lucide-react-native'
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import {
    OptionCards,
    PrimaryButton,
    SearchInput,
    SegmentedControl,
} from '../ui'
import { formatDateTime, formatDistanceText } from '../../utils'
import { DetailRow } from '../records/DetailRows'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const providerIcons: Record<string, any> = {
    hospital: Building2,
    clinic: Building2,
    pharmacy: Building2, // Reusing icon for simplicity or specific icons if available
    laboratory: Building2,
    doctor: Building2,
}

export function AccessGrantCard({ grant, onPress, isCompact }: any) {
    const Icon = providerIcons[grant.providerType] || Building2
    return (
        <Pressable
            className={cn("rounded-lg border border-border bg-card p-lg flex-row gap-md shadow-sm", isCompact ? "flex-col" : "")}
            onPress={onPress}
        >
            <View className="w-12 h-12 rounded-md bg-primary-light items-center justify-center">
                <Icon color="var(--color-primary)" size={24} />
            </View>
            <View className="flex-1 gap-2">
                <View className={cn("flex-row justify-between gap-md", isCompact ? "flex-col items-start" : "")}>
                    <View>
                        <Text className="text-text-primary text-[16px] font-bold">{grant.providerName}</Text>
                        <Text className="text-text-secondary text-[13px] mt-0.5 capitalize">{grant.providerType}</Text>
                    </View>
                    <View className={cn("rounded-pill px-2 py-1", grant.accessLevel === 'full' ? "bg-primary-light" : "bg-[#FFF4E1]")}>
                        <Text className={cn("text-[11px] font-bold capitalize", grant.accessLevel === 'full' ? "text-primary" : "text-[#D97706]")}>
                            {grant.accessLevel}
                        </Text>
                    </View>
                </View>

                <View className="flex-row flex-wrap gap-md">
                    <View className="flex-row items-center gap-1.5">
                        <Clock3 color="var(--color-muted-fg)" size={12} />
                        <Text className="text-muted-fg text-[12px]">Expires {formatDistanceText(grant.expiresAt)}</Text>
                    </View>
                    {grant.lastUsed && (
                        <View className="flex-row items-center gap-1.5">
                            <Eye color="var(--color-muted-fg)" size={12} />
                            <Text className="text-muted-fg text-[12px]">Used {formatDistanceText(grant.lastUsed)}</Text>
                        </View>
                    )}
                </View>
            </View>
        </Pressable>
    )
}

export function ExpiredGrantCard({ grant, isCompact }: any) {
    const Icon = providerIcons[grant.providerType] || Building2
    return (
        <View className={cn("rounded-lg bg-muted border border-border p-lg flex-row gap-md items-center opacity-[0.72]", isCompact ? "items-start flex-wrap" : "")}>
            <View className="w-10 h-10 rounded-md bg-muted items-center justify-center"><Icon color="var(--color-muted-fg)" size={20} /></View>
            <View className="flex-1 gap-0.5">
                <Text className="text-text-secondary font-bold">{grant.providerName}</Text>
                <Text className="text-muted-fg text-[12px]">Expired {formatDistanceText(grant.expiresAt)}</Text>
            </View>
            <View className="rounded-pill bg-muted px-2 py-1"><Text className="text-muted-fg text-[11px] font-bold">Expired</Text></View>
        </View>
    )
}

export function NewGrantForm({ method, setMethod, providerId, setProviderId, duration, setDuration, onGrant, isGranting }: any) {
    return (
        <View className="gap-lg pb-md">
            <SegmentedControl value={method} onChange={setMethod} options={[{ value: 'qr', label: 'Scan QR Code' }, { value: 'manual', label: 'Enter Provider ID' }]} />
            {method === 'qr' ? (
                <View className="rounded-lg border-2 border-dashed border-border bg-muted py-9 px-lg items-center gap-lg">
                    <QrCode color="var(--color-muted-fg)" size={42} />
                    <View className="items-center">
                        <Text className="text-text-primary text-[16px] font-bold text-center">Camera access required</Text>
                        <Text className="text-text-secondary text-[14px] text-center leading-5 mt-1">Point your camera at the provider&apos;s QR code.</Text>
                    </View>
                    <PrimaryButton variant="outline">Open Camera</PrimaryButton>
                </View>
            ) : (
                <View className="gap-lg">
                    <SearchInput value={providerId} onChangeText={setProviderId} placeholder="e.g., MediClinic Hospital" />
                    <OptionCards value={duration} onChange={setDuration} options={[{ value: '24h', label: '24 Hours' }, { value: '7d', label: '7 Days' }, { value: '30d', label: '30 Days' }, { value: '1y', label: '1 Year' }]} />
                    <View className="rounded-md bg-primary/10 p-lg flex-row gap-2 items-start">
                        <AlertCircle color="var(--color-info)" size={18} />
                        <Text className="flex-1 text-primary text-[13px] leading-5">The provider will only be able to view your records during this time period.</Text>
                    </View>
                    <PrimaryButton fullWidth onPress={onGrant} isLoading={isGranting} disabled={!providerId.trim()}>Grant Access</PrimaryButton>
                </View>
            )}
        </View>
    )
}

export function GrantDetailView({ grant, onRevoke }: any) {
    return (
        <View className="gap-lg pb-md">
            <DetailRow label="Provider Type" value={grant.providerType} />
            <DetailRow label="Access Level" value={grant.accessLevel} />
            <DetailRow label="Granted On" value={formatDateTime(grant.grantedAt)} />
            <DetailRow label="Expires On" value={formatDateTime(grant.expiresAt)} />
            <DetailRow label="Last Accessed" value={grant.lastUsed ? formatDateTime(grant.lastUsed) : undefined} />
            {grant.recordsAccessed?.length && (
                <View className="gap-sm">
                    <Text className="text-text-secondary text-[13px] font-semibold">Records Accessed</Text>
                    <View className="flex-row flex-wrap gap-sm">
                        {grant.recordsAccessed.map((record: string) => (
                            <View key={record} className="rounded-pill bg-muted px-2 py-1.5"><Text className="text-text-secondary text-[12px] font-bold">{record}</Text></View>
                        ))}
                    </View>
                </View>
            )}
            <PrimaryButton fullWidth variant="danger" onPress={onRevoke}>Revoke Access</PrimaryButton>
        </View>
    )
}
