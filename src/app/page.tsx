'use client';

import { useEffect, useState } from 'react';
import ChatPanel from './components/chat/ChatPanel';
import StagePanel from './components/stage/StagePanel';
import Header from './components/Header';
import { useUser } from '@/app/hooks/useUser';

export default function Home() {
  const { user } = useUser();
  const [storeResetDone, setStoreResetDone] = useState(false);
  
  // Effect zum Zurücksetzen des Stage-Stores
  useEffect(() => {
    if (user && !storeResetDone) {
      const resetStores = async () => {
        try {
          // Dynamisch importieren, um clientseitige Rendering-Fehler zu vermeiden
          const { resetStage } = await import('@/lib/store/stageStore');
          // Stage zurücksetzen
          resetStage();
          
          // sessionStorage für stage-storage leeren
          sessionStorage.removeItem('stage-storage');
          
          console.log('Stage wurde bei App-Start zurückgesetzt');
          setStoreResetDone(true);
        } catch (error) {
          console.error('Fehler beim Zurücksetzen der Stage:', error);
        }
      };
      
      resetStores();
    }
  }, [user, storeResetDone]);
  
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
