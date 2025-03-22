'use client';

export default function StagePanel() {
  return (
    <div className="w-1/2 flex flex-col h-full bg-[#f4f4f4]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Schreibbühne</h2>
        <p className="text-sm text-gray-500">Hier entsteht dein Text</p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose max-w-none">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Der freundliche Drache</h1>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <p className="text-gray-700 mb-4">
              In einem fernen Land, wo die Berge den Himmel berührten und die Wälder voller 
              Geheimnisse waren, lebte ein außergewöhnlicher Drache. Anders als seine 
              Artgenossen, die für ihr feuriges Temperament bekannt waren, war dieser 
              Drache sanftmütig und neugierig.
            </p>
            
            <p className="text-gray-700 mb-4">
              Die Menschen im nahe gelegenen Dorf nannten ihn "Funkel", weil seine 
              Schuppen im Sonnenlicht wie tausend kleine Diamanten glitzerten...
            </p>

            <div className="border-l-4 border-blue-500 pl-4 my-6 bg-blue-50 p-4 rounded-r">
              <p className="text-sm text-blue-800">
                Entwicklungsnotiz: Diese Stelle könnte noch ausgebaut werden. 
                Vielleicht eine Beschreibung von Funkels ersten Begegnungen mit den Dorfkindern?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">
            ✏️ Bearbeiten
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">
            💾 Speichern
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors ml-auto">
            📤 Exportieren
          </button>
        </div>
      </div>
    </div>
  );
} 