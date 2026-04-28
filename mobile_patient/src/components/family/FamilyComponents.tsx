import {
    ArrowLeftRight,
    Baby,
    Check,
    Heart,
    User,
    Users as UsersIcon,
} from 'lucide-react-native'
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { differenceInYears, parseISO } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import {
    Avatar,
    InputField,
    OptionCards,
    PrimaryButton,
    SecondaryButton,
} from '../ui'
import { formatDate } from '../../utils'
import { DetailRow } from '../records/DetailRows'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const relationshipIcons: Record<string, any> = {
    child: Baby,
    spouse: Heart,
    parent: User,
    sibling: UsersIcon,
    other: User,
}

export function MemberCard({ member, isActive, onDetails, onSwitch, isCompact, stackedActions, t }: any) {
    const Icon = relationshipIcons[member.relationship] || User
    const getAge = (value: string) => {
        try { return differenceInYears(new Date(), parseISO(value)) } catch { return 0 }
    }

    return (
        <Pressable
            className={cn(
                "rounded-lg border bg-card p-lg flex-row justify-between gap-md shadow-sm",
                isCompact ? "flex-col" : "",
                isActive ? "border-primary bg-primary-light" : "border-border"
            )}
            onPress={onDetails}
        >
            <View className={cn("flex-row gap-md flex-1", isCompact ? "w-full" : "")}>
                <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
                    <Icon color="#FFFFFF" size={22} />
                    {isActive && (
                        <View className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-primary items-center justify-center border-2 border-card">
                            <Check color="#FFFFFF" size={14} />
                        </View>
                    )}
                </View>
                <View className="flex-1 gap-1">
                    <Text className="text-text-primary text-[16px] font-bold">{member.profile.firstName} {member.profile.lastName}</Text>
                    <Text className="text-text-secondary text-[14px] capitalize">
                        {member.relationship} | {getAge(member.profile.dateOfBirth)} years old
                    </Text>
                    <View className="self-start rounded-pill bg-primary-light px-sm py-1">
                        <Text className="text-primary text-[11px] font-bold">
                            {member.accessLevel === 'full' ? t('family.fullAccess') : member.accessLevel === 'caregiver' ? t('family.caregiver') : t('family.viewOnly')}
                        </Text>
                    </View>
                </View>
            </View>
            <View className={cn("items-end justify-between gap-sm", isCompact ? "w-full flex-row items-start" : "", stackedActions ? "flex-col justify-start" : "")}>
                <Pressable onPress={onDetails}><Text className="text-primary text-[13px] font-bold">{t('common.details')}</Text></Pressable>
                <Pressable className="flex-row items-center gap-1" onPress={onSwitch}>
                    <ArrowLeftRight color="var(--color-text-secondary)" size={13} />
                    <Text className="text-text-secondary text-[12px] font-bold">{isActive ? t('family.switchBack') : t('family.switch')}</Text>
                </Pressable>
            </View>
        </Pressable>
    )
}

export function AddMemberForm({ relationship, setRelationship, firstName, setFirstName, lastName, setLastName, dob, setDob, phone, setPhone, options, onAdd, isAdding, isLargePhone }: any) {
    return (
        <View className="gap-lg pb-md">
            <OptionCards value={relationship} onChange={setRelationship} options={options} />
            <View className={cn("flex-row gap-md", !isLargePhone ? "flex-col" : "")}>
                <View className="flex-1"><InputField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" /></View>
                <View className="flex-1"><InputField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" /></View>
            </View>
            <InputField label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
            <InputField label="Phone Number (Optional)" value={phone} onChangeText={setPhone} placeholder="+250 788 123 456" keyboardType="phone-pad" />
            <PrimaryButton fullWidth size="lg" onPress={onAdd} isLoading={isAdding} disabled={!relationship || !firstName || !lastName}>Add Member</PrimaryButton>
        </View>
    )
}

export function MemberDetailView({ member, onSwitch, onRemove, isCompact, t }: any) {
    const getAge = (value: string) => {
        try { return differenceInYears(new Date(), parseISO(value)) } catch { return 0 }
    }
    return (
        <View className="gap-lg pb-md">
            <View className={cn("flex-row items-center gap-md", isCompact ? "flex-col items-start" : "")}>
                <Avatar name={`${member.profile.firstName} ${member.profile.lastName}`} size="lg" />
                <View>
                    <Text className="text-text-primary text-[18px] font-[800]">{member.profile.firstName} {member.profile.lastName}</Text>
                    <Text className="text-text-secondary text-[14px] mt-1 capitalize">{member.relationship} | {getAge(member.profile.dateOfBirth)} years old</Text>
                </View>
            </View>
            <DetailRow label="Date of Birth" value={formatDate(member.profile.dateOfBirth)} />
            <DetailRow label="Access Level" value={member.accessLevel === 'full' ? t('family.fullAccess') : member.accessLevel === 'caregiver' ? t('family.caregiver') : t('family.viewOnly')} />
            <DetailRow label="Added" value={formatDate(member.addedAt)} />
            <DetailRow label="Phone" value={member.profile.phoneNumber} />
            <View className="gap-md mt-md">
                <SecondaryButton fullWidth onPress={onSwitch} leftIcon={<ArrowLeftRight color="var(--color-primary)" size={16} />}>{t('family.switch')}</SecondaryButton>
                <PrimaryButton fullWidth variant="danger" onPress={onRemove}>{t('common.remove')}</PrimaryButton>
            </View>
        </View>
    )
}
