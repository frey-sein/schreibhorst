import ChatPanel from './components/chat/ChatPanel';
import StagePanel from './components/stage/StagePanel';
import Header from './components/Header';

export default function Home() {
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
