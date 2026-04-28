import React, { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { ArrowLeft, Trash2 } from 'lucide-react-native'
import { Header, ScreenContainer, PrimaryButton, InputField, SectionHeader } from '../../components/ui'
import { usePatientStore } from '../../store'
import { useTranslation } from '../../i18n'

export function EmergencyContactsScreen({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation()
    const { emergencyContacts, addEmergencyContact, removeEmergencyContact } = usePatientStore()
    const [showAdd, setShowAdd] = useState(false)
    const [newName, setNewName] = useState('')
    const [newPhone, setNewPhone] = useState('')
    const [newRelation, setNewRelation] = useState('')

    const handleAdd = () => {
        if (!newName || !newPhone) return
        addEmergencyContact({
            id: `ec-${Date.now()}`,
            name: newName,
            phoneNumber: newPhone,
            relationship: newRelation || 'Other',
            isPrimary: emergencyContacts.length === 0,
        })
        setShowAdd(false)
        setNewName('')
        setNewPhone('')
        setNewRelation('')
    }

    return (
        <ScreenContainer
            header={
                <Header
                    title={t('profile.emergencyContacts')}
                    leftAction={
                        <Pressable onPress={onBack} className="w-10 h-10 justify-center -ml-[10px]">
                            <ArrowLeft color="var(--color-text-primary)" size={24} />
                        </Pressable>
                    }
                />
            }
        >
            <View className="py-2.5 gap-4">
                <SectionHeader title="Active Contacts" />

                {emergencyContacts.length === 0 ? (
                    <Text className="text-[15px] leading-6 text-text-secondary text-center mt-10">
                        You haven&apos;t added any emergency contacts yet.
                    </Text>
                ) : (
                    <View className="gap-3">
                        {emergencyContacts.map(contact => (
                            <View key={contact.id} className="flex-row items-center p-md rounded-xl border border-border bg-muted">
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-[16px] font-bold text-text-primary">{contact.name}</Text>
                                        {contact.isPrimary && (
                                            <View className="bg-primary/10 px-2 py-0.5 rounded-[4px]">
                                                <Text className="text-primary text-[10px] font-[800] uppercase">Primary</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-text-secondary text-[13px]">{contact.relationship} • {contact.phoneNumber}</Text>
                                </View>
                                <Pressable onPress={() => removeEmergencyContact(contact.id)}>
                                    <Trash2 color="var(--color-error)" size={20} />
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                {!showAdd ? (
                    <View className="mt-6">
                        <PrimaryButton fullWidth variant="outline" onPress={() => setShowAdd(true)}>Add Contact</PrimaryButton>
                    </View>
                ) : (
                    <View className="p-md rounded-xl border border-border bg-card mt-6 gap-3">
                        <InputField label="Name" value={newName} onChangeText={setNewName} placeholder="Full Name" />
                        <InputField label="Phone" value={newPhone} onChangeText={setNewPhone} placeholder="+250 7..." keyboardType="phone-pad" />
                        <InputField label="Relationship" value={newRelation} onChangeText={setNewRelation} placeholder="e.g. Spouse" />
                        <View className="flex-row gap-3 mt-2">
                            <View className="flex-1">
                                <PrimaryButton variant="outline" fullWidth onPress={() => setShowAdd(false)}>Cancel</PrimaryButton>
                            </View>
                            <View className="flex-1">
                                <PrimaryButton fullWidth onPress={handleAdd}>Save</PrimaryButton>
                            </View>
                        </View>
                    </View>
                )}

                <View className="mt-8 p-md bg-primary/5 rounded-xl">
                    <Text className="text-[13px] leading-5 text-text-secondary text-center">
                        Emergency contacts can access your basic medical info (blood type, allergies) in case of emergency.
                    </Text>
                </View>
            </View>
        </ScreenContainer>
    )
}
