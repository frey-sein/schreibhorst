import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TextDraft, ImageDraft } from '@/types/stage';

interface StageSnapshot {
  id: string;
  timestamp: Date;
  textDrafts: TextDraft[];
  imageDrafts: ImageDraft[];
}

interface StageHistoryStore {
  snapshots: StageSnapshot[];
  currentSnapshotId: string | null;
  addSnapshot: (textDrafts: TextDraft[], imageDrafts: ImageDraft[]) => void;
  restoreSnapshot: (id: string) => StageSnapshot | null;
  getSnapshots: () => StageSnapshot[];
  clearSnapshots: () => void;
}

export const useStageHistoryStore = create<StageHistoryStore>()(
  persist(
    (set, get) => ({
      snapshots: [],
      currentSnapshotId: null,

      addSnapshot: (textDrafts, imageDrafts) => {
        const newSnapshot: StageSnapshot = {
          id: new Date().getTime().toString(),
          timestamp: new Date(),
          textDrafts: JSON.parse(JSON.stringify(textDrafts)),
          imageDrafts: JSON.parse(JSON.stringify(imageDrafts))
        };

        set(state => ({
          snapshots: [newSnapshot, ...state.snapshots],
          currentSnapshotId: newSnapshot.id
        }));
      },

      restoreSnapshot: (id) => {
        const { snapshots } = get();
        const snapshot = snapshots.find(s => s.id === id);
        if (snapshot) {
          set({ currentSnapshotId: id });
          return {
            ...snapshot,
            timestamp: snapshot.timestamp instanceof Date ? snapshot.timestamp : new Date(snapshot.timestamp) // Sicherstellen, dass es ein Date-Objekt ist
          };
        }
        return null;
      },

      getSnapshots: () => {
        const { snapshots } = get();
        return snapshots.map(snapshot => ({
          ...snapshot,
          timestamp: snapshot.timestamp instanceof Date ? snapshot.timestamp : new Date(snapshot.timestamp) // Sicherstellen, dass es ein Date-Objekt ist
        }));
      },

      clearSnapshots: () => set({ snapshots: [], currentSnapshotId: null }),
    }),
    {
      name: 'stage-history-storage',
      partialize: (state) => ({
        snapshots: state.snapshots.map(snapshot => ({
          ...snapshot,
          timestamp: snapshot.timestamp instanceof Date ? snapshot.timestamp.toISOString() : snapshot.timestamp // Prüfe, ob timestamp ein Date ist
        })),
        currentSnapshotId: state.currentSnapshotId
      })
    }
  )
); 