import ChatPanel from './components/chat/ChatPanel';
import StagePanel from './components/stage/StagePanel';

export default function Home() {
  return (
    <main className="flex h-screen">
      <div className="flex w-full">
        <ChatPanel />
        <div className="w-[1px] bg-[#ccc]"></div>
        <StagePanel />
      </div>
    </main>
  );
}
