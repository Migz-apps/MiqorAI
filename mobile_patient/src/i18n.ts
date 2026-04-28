import { usePatientStore } from './store'

export const translations = {
    en: {
        common: {
            login: 'Login',
            signup: 'Sign Up',
            logout: 'Logout',
            next: 'Next',
            back: 'Back',
            skip: 'Skip',
            save: 'Save',
            cancel: 'Cancel',
            search: 'Search',
            close: 'Close',
            details: 'Details',
            active: 'Active',
            remove: 'Remove',
            confirm: 'Confirm',
        },
        tabs: {
            home: 'Home',
            records: 'Records',
            records_conditions: 'Conditions',
            records_medications: 'Medications',
            records_allergies: 'Allergies',
            records_labs: 'Labs',
            records_immunizations: 'Immunizations',
            records_procedures: 'Procedures',
            share: 'Share',
            share_active_grants: 'Active Grants',
            share_access_log: 'Access Log',
            family: 'Family',
            profile: 'Profile',
        },
        qr: {
            refreshesIn: 'Refreshes in',
            instruction: 'Scan at hospital or pharmacy',
            tapToEnlarge: 'Tap to enlarge',
            refresh: 'Refresh',
            fullscreen: 'Fullscreen',
            share: 'Share',
            copyId: 'Copy ID',
            shareTitle: 'My Med-Pass QR Code',
            shareMessage: 'Scan this Med-Pass QR code to securely access my medical records',
        },
        family: {
            yourFamily: 'Your Family',
            familyMembers: 'Family Members',
            add: 'Add',
            switch: 'Switch',
            switchBack: 'Switch Back',
            me: 'You',
            primaryAccount: 'Primary Account Holder',
            fullAccess: 'Full Access',
            caregiver: 'Caregiver',
            viewOnly: 'View Only',
            noMembers: 'No family members yet',
            addDesc: 'Add family members to manage their health records from your account.',
            whyAdd: 'Why add family members?',
        },
        home: {
            greeting: 'Good morning',
            allergyAlert: 'ALLERGY ALERT',
            upcomingEvents: 'Upcoming Events',
            recentActivity: 'Recent Activity',
            viewAll: 'View All',
            showLess: 'Show Less',
        },
        profile: {
            settings: 'Settings',
            notifications: 'Notifications',
            biometrics: 'Biometric Login',
            darkMode: 'Dark Mode',
            language: 'Language',
            helpSupport: 'Help & Support',
            privacyPolicy: 'Privacy Policy',
            termsOfService: 'Terms of Service',
            exportData: 'Export My Data',
            deleteAccount: 'Delete Account',
        }
    },
    rw: {
        common: {
            login: 'Kwinjira',
            signup: 'Kwiyandikisha',
            logout: 'Sohoka',
            next: 'Ibikurikira',
            back: 'Subira inyuma',
            skip: 'Simbuka',
            save: 'Bika',
            cancel: 'Hagarika',
            search: 'Shakisha',
            close: 'Funga',
            details: 'Ibisobanuro',
            active: 'Gukora',
            remove: 'Kuraho',
            confirm: 'Kwemeza',
        },
        tabs: {
            home: 'Ahabanza',
            records: 'Amadosiye',
            records_conditions: 'Uburwayi',
            records_medications: 'Imiti',
            records_allergies: 'Allergies',
            records_labs: 'Laboratwari',
            records_immunizations: 'Inkingo',
            records_procedures: 'Ibikorwa',
            share: 'Sangiza',
            share_active_grants: 'Uburenganzira',
            share_access_log: 'Garuka',
            family: 'Umuryango',
            profile: 'Umwirondoro',
        },
        qr: {
            refreshesIn: 'Ihinduka mu',
            instruction: 'Sikanisha kwa muganga',
            tapToEnlarge: 'Kanda hano ngo ibe nini',
            refresh: 'Ihindure',
            fullscreen: 'Yagure',
            share: 'Sangiza',
            copyId: 'Koporura ID',
            shareTitle: 'Med-Pass QR Yanjye',
            shareMessage: 'Sikanisha iyi QR code ngo ubone amadosiye yanjye',
        },
        family: {
            yourFamily: 'Umuryango Wawe',
            familyMembers: 'Abagize Umuryango',
            add: 'Ongeraho',
            switch: 'Hindura',
            switchBack: 'Subira Kuri Njye',
            me: 'Njye',
            primaryAccount: 'Nyiri Konti',
            fullAccess: 'Uburenganzira bwose',
            caregiver: 'Urureberera',
            viewOnly: 'Kureba gusa',
            noMembers: 'Nta muryango urandika',
            addDesc: 'Ongeraho umuryango ngo uberebere amadosiye yabo.',
            whyAdd: 'Kuki wongeraho umuryango?',
        },
        home: {
            greeting: 'Mwaramutse',
            allergyAlert: 'ALERTI Y\'UBURWAYI',
            upcomingEvents: 'Ibicamare bije',
            recentActivity: 'Ibikorwa bya vuba',
            viewAll: 'Reba byose',
            showLess: 'Hisha bimwe',
        },
        profile: {
            settings: 'Igenamiterere',
            notifications: 'Imenyesha',
            biometrics: 'Kwinjira n\'igikumwe',
            darkMode: 'Uburyo bwijimye',
            language: 'Ururimi',
            helpSupport: 'Ubufasha',
            privacyPolicy: 'Amategeko y\'ibanga',
            termsOfService: 'Amategeko n\'amabwiriza',
            exportData: 'Sohora amadosiye',
            deleteAccount: 'Siba konti',
        }
    },
    fr: {
        common: {
            login: 'Connexion',
            signup: 'S\'inscrire',
            logout: 'Déconnexion',
            next: 'Suivant',
            back: 'Retour',
            skip: 'Passer',
            save: 'Enregistrer',
            cancel: 'Annuler',
            search: 'Rechercher',
            close: 'Fermer',
            details: 'Détails',
            active: 'Actif',
            remove: 'Supprimer',
            confirm: 'Confirmer',
        },
        tabs: {
            home: 'Accueil',
            records: 'Dossiers',
            records_conditions: 'Maladies',
            records_medications: 'Médicaments',
            records_allergies: 'Allergies',
            records_labs: 'Analyses',
            records_immunizations: 'Vaccins',
            records_procedures: 'Procédures',
            share: 'Partager',
            share_active_grants: 'Autorisations',
            share_access_log: 'Journal d\'accès',
            family: 'Famille',
            profile: 'Profil',
        },
        qr: {
            refreshesIn: 'S\'actualise dans',
            instruction: 'Scanner à l\'hôpital',
            tapToEnlarge: 'Appuyer pour agrandir',
            refresh: 'Actualiser',
            fullscreen: 'Plein écran',
            share: 'Partager',
            copyId: 'Copier l\'ID',
            shareTitle: 'Mon Code QR Med-Pass',
            shareMessage: 'Scannez ce code QR pour accéder à mes dossiers médicaux',
        },
        family: {
            yourFamily: 'Votre Famille',
            familyMembers: 'Membres',
            add: 'Ajouter',
            switch: 'Changer',
            switchBack: 'Retourner',
            me: 'Moi',
            primaryAccount: 'Compte Principal',
            fullAccess: 'Accès Complet',
            caregiver: 'Aidant',
            viewOnly: 'Lecture Seule',
            noMembers: 'Aucun membre',
            addDesc: 'Ajoutez des membres pour gérer leurs dossiers.',
            whyAdd: 'Pourquoi ajouter sa famille?',
        },
        home: {
            greeting: 'Bonjour',
            allergyAlert: 'ALERTE ALLERGIE',
            upcomingEvents: 'Événements à venir',
            recentActivity: 'Activité récente',
            viewAll: 'Voir tout',
            showLess: 'Voir moins',
        },
        profile: {
            settings: 'Paramètres',
            notifications: 'Notifications',
            biometrics: 'Biométrie',
            darkMode: 'Mode Sombre',
            language: 'Langue',
            helpSupport: 'Aide et Support',
            privacyPolicy: 'Confidentialité',
            termsOfService: 'Conditions',
            exportData: 'Exporter mes données',
            deleteAccount: 'Supprimer le compte',
        }
    }
}

export const useTranslation = () => {
    const language = usePatientStore((state) => state.language) || 'en'
    const t = (path: string) => {
        const keys = path.split('.')
        let result: any = (translations as any)[language]
        for (const key of keys) {
            if (result && result[key]) {
                result = result[key]
            } else {
                // Fallback to English
                result = (translations as any)['en']
                for (const k of keys) {
                    if (result && result[k]) {
                        result = result[k]
                    } else {
                        result = undefined;
                        break;
                    }
                }
                break
            }
        }
        return result || path
    }
    return { t, language }
}
