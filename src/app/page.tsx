'use client';

import { useEffect, useState } from 'react';
import ChatPanel from './components/chat/ChatPanel';
import StagePanel from './components/stage/StagePanel';
import Header from './components/Header';
import { useUser } from '@/app/hooks/useUser';

export default function Home() {
  const { user } = useUser();
  const [storeResetDone, setStoreResetDone] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Effect zum Laden der Stage-Daten
  useEffect(() => {
    setIsMounted(true);
    
    if (user && !storeResetDone) {
      const loadStoredData = async () => {
        try {
          // Dynamisch importieren, um clientseitige Rendering-Fehler zu vermeiden
          const { useStageStore } = await import('@/lib/store/stageStore');
          const { useStageHistoryStore } = await import('@/lib/store/stageHistoryStore');
          
          // Importiere die Funktion, aber führe sie nicht aus, um vorhandene Daten zu behalten
          // const { resetStage } = await import('@/lib/store/stageStore');
          
          // Aktiviere die Hydration des Zustandsspeichers
          const storeState = useStageStore.getState();
          
          // Versuche, vorhandene Daten wiederherzustellen - ohne explizite Typprüfung
          // @ts-ignore - Zugriff auf interne persist-Methoden
          if (storeState && storeState.persist?.rehydrate) {
            // @ts-ignore - Zugriff auf interne persist-Methoden
            storeState.persist.rehydrate();
          }
          
          // ChatId abrufen, wenn verfügbar
          const currentChatId = storeState.chatId;
          
          // Falls eine Chat-ID vorhanden ist, versuche den letzten Snapshot zu laden
          if (currentChatId) {
            const stageHistoryStore = useStageHistoryStore.getState();
            stageHistoryStore.setCurrentChatId(currentChatId);
            
            // Snapshots abrufen
            const snapshots = await stageHistoryStore.getSnapshots();
            console.log(`${snapshots.length} Snapshots für Chat ${currentChatId} gefunden`);
          }
          
          console.log('Stage-Daten wurden geladen');
          
          setStoreResetDone(true);
        } catch (error) {
          console.error('Fehler beim Laden der Stage-Daten:', error);
        }
      };
      
      loadStoredData();
    }
  }, [user, storeResetDone]);
  
  // Nur clientseitiges Rendering
  if (!isMounted) {
    return null; // oder eine einfache Ladeansicht
  }
  
  return (
    <>
      <Header />
      <main className="flex h-screen">
        <div className="flex w-full">
          <ChatPanel />
          <div className="w-[1px] bg-[#ccc]"></div>
          <StagePanel />
        </div>
      </main>
    </>
  );
}
