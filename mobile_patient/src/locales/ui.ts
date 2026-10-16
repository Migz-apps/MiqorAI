import type { LocaleModule } from './translate'

export const uiStrings: LocaleModule = {
  en: {
    ui: {
      brand: {
        patientPortal: 'Patient Portal',
      },
      layout: {
        openProfile: 'Open profile',
        openProfileFor: '{{name}}, open profile',
      },
      forms: {
        clearSearch: 'Clear search',
        pinLabel_one: 'PIN, {{count}} digit',
        pinLabel_other: 'PIN, {{count}} digits',
        pinValue: '{{entered}} of {{length}} entered',
        pinHint: 'Opens the number keypad',
      },
      feedback: {
        loading: 'Loading...',
        splashLabel: 'MiqorAI, Patient Portal, loading',
        offline: "You're offline.",
        pending_one: '{{count}} change pending.',
        pending_other: '{{count}} changes pending.',
        lastSynced: 'Last synced: {{time}}',
      },
      cards: {
        openDetails: 'Opens details',
        prescribedBy: 'Prescribed by: {{name}}',
        allergyType: '{{type}} allergy',
        reaction: 'Reaction: {{reaction}}',
        allergyLabel: '{{name}} allergy, {{severity}}',
        viewLess: 'View Less',
        activity: {
          viewed: 'Viewed',
          updated: 'Updated',
          shared: 'Shared',
          downloaded: 'Downloaded',
        },
        medicationStatus: {
          current: 'Current',
          completed: 'Completed',
          discontinued: 'Discontinued',
        },
        severity: {
          mild: 'Mild',
          moderate: 'Moderate',
          severe: 'Severe',
        },
      },
      modals: {
        dismiss: 'Dismiss',
      },
      toast: {
        fallback: 'Something went wrong. Please try again.',
        dismiss: 'Dismiss notification',
      },
    },
  },
  rw: {
    ui: {
      brand: {
        patientPortal: "Urubuga rw'umurwayi",
      },
      layout: {
        openProfile: 'Fungura umwirondoro',
        openProfileFor: '{{name}}, fungura umwirondoro',
      },
      forms: {
        clearSearch: 'Siba ibyo washakishaga',
        pinLabel_one: 'PIN, umubare {{count}}',
        pinLabel_other: 'PIN, imibare {{count}}',
        pinValue: '{{entered}} kuri {{length}} byinjijwe',
        pinHint: "Ifungura utubuto tw'imibare",
      },
      feedback: {
        loading: 'Tegereza gato...',
        splashLabel: "MiqorAI, urubuga rw'umurwayi, birimo gufunguka",
        offline: 'Nta murandasi ufite.',
        pending_one: 'Impinduka {{count}} itegereje koherezwa.',
        pending_other: 'Impinduka {{count}} zitegereje koherezwa.',
        lastSynced: 'Biheruka guhuzwa: {{time}}',
      },
      cards: {
        openDetails: 'Ifungura ibisobanuro birambuye',
        prescribedBy: 'Byanditswe na: {{name}}',
        allergyType: 'Allergie ya {{type}}',
        reaction: 'Ingaruka: {{reaction}}',
        allergyLabel: 'Allergie ya {{name}}, {{severity}}',
        viewLess: 'Reba bike',
        activity: {
          viewed: 'Yarebye',
          updated: 'Yavuguruye',
          shared: 'Yasangije',
          downloaded: 'Yakuruye',
        },
        medicationStatus: {
          current: 'Iri gukoreshwa',
          completed: 'Yarangiye',
          discontinued: 'Yahagaritswe',
        },
        severity: {
          mild: 'Byoroheje',
          moderate: 'Biringaniye',
          severe: 'Bikomeye',
        },
      },
      modals: {
        dismiss: 'Funga',
      },
      toast: {
        fallback: 'Hari ikibazo cyabaye. Ongera ugerageze.',
        dismiss: 'Funga ubutumwa',
      },
    },
  },
  fr: {
    ui: {
      brand: {
        patientPortal: 'Portail patient',
      },
      layout: {
        openProfile: 'Ouvrir le profil',
        openProfileFor: '{{name}}, ouvrir le profil',
      },
      forms: {
        clearSearch: 'Effacer la recherche',
        pinLabel_one: 'Code PIN, {{count}} chiffre',
        pinLabel_other: 'Code PIN, {{count}} chiffres',
        pinValue: '{{entered}} sur {{length}} saisis',
        pinHint: 'Ouvre le clavier numérique',
      },
      feedback: {
        loading: 'Chargement...',
        splashLabel: 'MiqorAI, portail patient, chargement',
        offline: 'Vous êtes hors ligne.',
        pending_one: '{{count}} modification en attente.',
        pending_other: '{{count}} modifications en attente.',
        lastSynced: 'Dernière synchronisation : {{time}}',
      },
      cards: {
        openDetails: 'Ouvre les détails',
        prescribedBy: 'Prescrit par : {{name}}',
        allergyType: 'Allergie : {{type}}',
        reaction: 'Réaction : {{reaction}}',
        allergyLabel: 'Allergie à {{name}}, {{severity}}',
        viewLess: 'Voir moins',
        activity: {
          viewed: 'Consulté',
          updated: 'Mis à jour',
          shared: 'Partagé',
          downloaded: 'Téléchargé',
        },
        medicationStatus: {
          current: 'En cours',
          completed: 'Terminé',
          discontinued: 'Arrêté',
        },
        severity: {
          mild: 'Légère',
          moderate: 'Modérée',
          severe: 'Sévère',
        },
      },
      modals: {
        dismiss: 'Fermer',
      },
      toast: {
        fallback: 'Une erreur s’est produite. Veuillez réessayer.',
        dismiss: 'Fermer la notification',
      },
    },
  },
}
