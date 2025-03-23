export const CHAT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  DEFAULT_MODEL: 'openai/gpt-3.5-turbo',
  SYSTEM_PROMPT: 'Du bist ein hilfreicher KI-Assistent. Antworte immer auf Deutsch, auch wenn der Benutzer in einer anderen Sprache schreibt. Bleibe höflich und professionell. Verwende eine klare und verständliche Sprache.',
  ERROR_MESSAGES: {
    NETWORK: 'Netzwerkfehler beim Senden der Nachricht',
    ANALYSIS: 'Fehler bei der Analyse des Chats.',
    FILE_FORMAT: 'Dieses Dateiformat wird nicht unterstützt.',
    STREAM: 'Stream konnte nicht initialisiert werden',
    GENERATION: 'Fehler bei der Bildgenerierung',
    FILE_PROCESSING: 'Fehler beim Verarbeiten der Datei.',
    API_ERROR: 'Fehler bei der API-Anfrage.'
  },
  UI_MESSAGES: {
    WELCOME: 'Hallo! Ich bin dein KI-Assistent. Ich antworte immer auf Deutsch. Wie kann ich dir helfen?',
    LOADING: 'Wird verarbeitet...',
    NO_DRAFTS: 'Keine Bildentwürfe vorhanden. Bitte analysiere zuerst den Chat.',
    GENERATING: 'Bild wird generiert...',
    ERROR: 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
    NO_HISTORY: 'Keine Chats verfügbar',
    MESSAGES: 'Nachrichten',
    DELETE_CHAT: 'Chat löschen'
  }
} as const; 