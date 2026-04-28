import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { formatDate } from '../../utils'
import { DetailRow } from './DetailRows'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export type RecordTab = 'conditions' | 'medications' | 'allergies' | 'labs' | 'immunizations' | 'procedures'

interface RecordDetailContentProps {
    item: any
    type: RecordTab
    isCompact?: boolean
}

export function RecordDetailContent({ item, type, isCompact }: RecordDetailContentProps) {
    switch (type) {
        case 'conditions': {
            return (
                <View className="gap-md">
                    <DetailRow label="Status" value={item.status} />
                    <DetailRow label="Diagnosed" value={formatDate(item.diagnosedDate)} />
                    <DetailRow label="Treating Doctor" value={item.treatingDoctor} />
                    {item.notes ? (
                        <View>
                            <Text className="text-text-secondary text-[13px] font-semibold">Notes</Text>
                            <Text className="text-text-primary text-[15px] leading-[22px] mt-1.5">{item.notes}</Text>
                        </View>
                    ) : null}
                </View>
            )
        }
        case 'medications': {
            return (
                <View className="gap-md">
                    <DetailRow label="Dosage" value={item.dosage} />
                    <DetailRow label="Frequency" value={item.frequency} />
                    <DetailRow label="Status" value={item.status} />
                    <DetailRow label="Prescribed By" value={item.prescribedBy} />
                    <DetailRow label="Start Date" value={formatDate(item.prescribedDate)} />
                    <DetailRow label="End Date" value={item.endDate ? formatDate(item.endDate) : undefined} />
                    {item.instructions ? (
                        <View>
                            <Text className="text-text-secondary text-[13px] font-semibold">Instructions</Text>
                            <Text className="text-text-primary text-[15px] leading-[22px] mt-1.5">{item.instructions}</Text>
                        </View>
                    ) : null}
                </View>
            )
        }
        case 'allergies': {
            return (
                <View className="gap-md">
                    <DetailRow label="Severity" value={item.severity} />
                    <DetailRow label="Type" value={item.type} />
                    <DetailRow label="Diagnosed" value={formatDate(item.diagnosedDate)} />
                    {item.reaction ? (
                        <View>
                            <Text className="text-text-secondary text-[13px] font-semibold">Reaction</Text>
                            <Text className="text-text-primary text-[15px] leading-[22px] mt-1.5">{item.reaction}</Text>
                        </View>
                    ) : null}
                </View>
            )
        }
        case 'labs': {
            return (
                <View className="gap-md">
                    <View className="rounded-md bg-muted py-5 items-center">
                        <Text className="text-text-primary text-[30px] font-[900]">
                            {item.result}
                            {item.unit ? ` ${item.unit}` : ''}
                        </Text>
                        <View className="mt-2 flex-row items-center gap-1">
                            {item.status === 'normal' ? (
                                <Minus color="var(--color-success)" size={16} />
                            ) : item.status === 'abnormal' ? (
                                <TrendingUp color="var(--color-secondary)" size={16} />
                            ) : (
                                <TrendingDown color="var(--color-error)" size={16} />
                            )}
                            <Text className={cn(
                                "text-[14px] font-bold uppercase",
                                item.status === 'normal' ? "text-success" : item.status === 'abnormal' ? "text-secondary" : "text-error"
                            )}>{item.status}</Text>
                        </View>
                    </View>
                    <DetailRow label="Reference Range" value={item.referenceRange} />
                    <DetailRow label="Date" value={formatDate(item.date)} />
                    <DetailRow label="Ordered By" value={item.orderedBy} />
                    <DetailRow label="Facility" value={item.facility} />
                </View>
            )
        }
        case 'immunizations': {
            return (
                <View className="gap-md">
                    <DetailRow label="Administered" value={formatDate(item.dateAdministered)} />
                    <DetailRow label="Facility" value={item.facility} />
                    <DetailRow label="Administered By" value={item.administeredBy} />
                    <DetailRow label="Lot Number" value={item.lotNumber} />
                    <DetailRow label="Next Dose" value={item.nextDoseDate ? formatDate(item.nextDoseDate) : undefined} />
                </View>
            )
        }
        case 'procedures': {
            return (
                <View className="gap-md">
                    <DetailRow label="Status" value={item.status} />
                    <DetailRow label="Date" value={formatDate(item.date)} />
                    <DetailRow label="Facility" value={item.facility} />
                    <DetailRow label="Surgeon" value={item.surgeon} />
                    {item.notes ? (
                        <View>
                            <Text className="text-text-secondary text-[13px] font-semibold">Notes</Text>
                            <Text className="text-text-primary text-[15px] leading-[22px] mt-1.5">{item.notes}</Text>
                        </View>
                    ) : null}
                </View>
            )
        }
        default:
            return null
    }
}
