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
  },
  DEEP_RESEARCH_PROMPT: 'Du bist ein hilfreicher KI-Assistent mit erweiterter Recherchefähigkeit. Recherchiere gründlich, bevor du antwortest. Antworte immer auf Deutsch, auch wenn der Benutzer in einer anderen Sprache schreibt. Nutze fundierte Quellen und gib umfassende Erklärungen mit Kontext und Fakten.'
} as const;

// Modelle, die die Deep Research-Funktionalität unterstützen
export const DEEP_RESEARCH_MODELS = [
  'anthropic/claude-3-opus',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4-turbo',
  'openai/gpt-4o',
  // Erweiterte Modellnamen hinzufügen
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-4o',
  'claude-3-opus',
  'claude-3.5-sonnet'
] as const; 