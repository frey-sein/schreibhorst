import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TextDraft, ImageDraft } from '@/types/stage';

interface StageSnapshot {
  id: string;
  timestamp: Date;
  textDrafts: TextDraft[];
  imageDrafts: ImageDraft[];
  chatId?: string;
}

interface StageHistoryStore {
  snapshots: StageSnapshot[];
  currentSnapshotId: string | null;
  currentChatId: string | null;
  addSnapshot: (textDrafts: TextDraft[], imageDrafts: ImageDraft[], chatId?: string) => Promise<void>;
  restoreSnapshot: (id: string) => Promise<StageSnapshot | null>;
  getSnapshots: () => Promise<StageSnapshot[]>;
  clearSnapshots: () => Promise<void>;
  setCurrentChatId: (chatId: string | null) => void;
}

export const useStageHistoryStore = create<StageHistoryStore>((set, get) => ({
  snapshots: [],
  currentSnapshotId: null,
  currentChatId: null,

  addSnapshot: async (textDrafts, imageDrafts, chatId) => {
    // Neues Snapshot-Objekt erstellen
    const newSnapshot: StageSnapshot = {
      id: new Date().getTime().toString(),
      timestamp: new Date(),
      textDrafts: JSON.parse(JSON.stringify(textDrafts)),
      imageDrafts: JSON.parse(JSON.stringify(imageDrafts)),
      chatId: chatId || (get().currentChatId || undefined)
    };

    // Im Store aktualisieren
    set(state => ({
      snapshots: [newSnapshot, ...state.snapshots],
      currentSnapshotId: newSnapshot.id
    }));

    // Zum Server senden und persistent speichern
    try {
      await fetch('/api/stage-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: newSnapshot.id,
          textDrafts: newSnapshot.textDrafts,
          imageDrafts: newSnapshot.imageDrafts,
          chatId: newSnapshot.chatId
        })
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Snapshots:', error);
    }
  },

  restoreSnapshot: async (id) => {
    // Zuerst im lokalen Store nachsehen
    const { snapshots } = get();
    let snapshot = snapshots.find(s => s.id === id);
    
    // Wenn nicht im lokalen Store, vom Server holen
    if (!snapshot) {
      try {
        const response = await fetch(`/api/stage-history?id=${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.snapshot) {
            snapshot = {
              ...data.snapshot,
              timestamp: new Date(data.snapshot.timestamp)
            };
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Snapshots vom Server:', error);
      }
    }
    
    if (snapshot) {
      set({ currentSnapshotId: id });
      return {
        ...snapshot,
        timestamp: snapshot.timestamp instanceof Date 
          ? snapshot.timestamp 
          : new Date(snapshot.timestamp)
      };
    }
    return null;
  },

  getSnapshots: async () => {
    try {
      // Erstelle URL mit Chat-ID Parameter falls vorhanden
      let url = '/api/stage-history';
      const chatId = get().currentChatId;
      if (chatId) {
        url += `?chatId=${encodeURIComponent(chatId)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.snapshots) {
        const snapshots = data.snapshots.map((snapshot: any) => ({
          ...snapshot,
          timestamp: new Date(snapshot.timestamp)
        }));
        
        set({ snapshots });
        return snapshots;
      }
      return [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Snapshots:', error);
      return [];
    }
  },

  clearSnapshots: async () => {
    // Im lokalen Store löschen
    set({ snapshots: [], currentSnapshotId: null });
    
    // Vom Server löschen
    try {
      await fetch('/api/stage-history', {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Snapshots vom Server:', error);
    }
  },

  setCurrentChatId: (chatId) => {
    set({ currentChatId: chatId });
  }
})); 