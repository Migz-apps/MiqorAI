import React from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { useResponsive } from '../../responsive'
import { RecordTab } from './RecordDetails'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface TabItem {
    id: RecordTab
    label: string
    icon: any
    count?: number
}

interface RecordTabsProps {
    tabs: TabItem[]
    activeTab: RecordTab
    onTabChange: (id: RecordTab) => void
    setSearchQuery: (query: string) => void
}

export function RecordTabs({ tabs, activeTab, onTabChange, setSearchQuery }: RecordTabsProps) {
    const { isLargePhone, isTablet } = useResponsive()
    const tabChipWidth = isTablet ? '31.5%' : '48.2%'

    if (isLargePhone) {
        return (
            <View className="flex-row flex-wrap gap-sm">
                {tabs.map((tab) => {
                    const active = tab.id === activeTab
                    const Icon = tab.icon
                    return (
                        <Pressable
                            key={tab.id}
                            style={{ flexBasis: tabChipWidth }}
                            className={cn(
                                "rounded-pill bg-muted min-h-[40px] flex-row items-center gap-sm px-lg justify-center",
                                active ? "bg-primary" : ""
                            )}
                            onPress={() => {
                                onTabChange(tab.id)
                                setSearchQuery('')
                            }}
                        >
                            <Icon color={active ? '#FFFFFF' : "var(--color-muted-fg)"} size={16} />
                            <Text className={cn("text-[14px] font-bold", active ? "text-white" : "text-muted-fg")}>{tab.label}</Text>
                            {tab.count ? (
                                <View className={cn("rounded-pill px-1.5 py-0.5 bg-black/5", active ? "bg-white/20" : "")}>
                                    <Text className={cn("text-[11px] font-bold", active ? "text-white" : "text-text-secondary")}>{tab.count}</Text>
                                </View>
                            ) : null}
                        </Pressable>
                    )
                })}
            </View>
        )
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
            {tabs.map((tab) => {
                const active = tab.id === activeTab
                const Icon = tab.icon
                return (
                    <Pressable
                        key={tab.id}
                        className={cn(
                            "rounded-pill bg-muted min-h-[40px] flex-row items-center gap-sm px-lg",
                            active ? "bg-primary" : ""
                        )}
                        onPress={() => {
                            onTabChange(tab.id)
                            setSearchQuery('')
                        }}
                    >
                        <Icon color={active ? '#FFFFFF' : "var(--color-muted-fg)"} size={16} />
                        <Text className={cn("text-[14px] font-bold", active ? "text-white" : "text-muted-fg")}>{tab.label}</Text>
                        {tab.count ? (
                            <View className={cn("rounded-pill px-1.5 py-0.5 bg-black/5", active ? "bg-white/20" : "")}>
                                <Text className={cn("text-[11px] font-bold", active ? "text-white" : "text-text-secondary")}>{tab.count}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                )
            })}
        </ScrollView>
    )
}
