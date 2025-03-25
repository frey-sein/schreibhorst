'use client';

import { useState, useEffect } from 'react';
import { AgentResearchResult } from '@/types/agent';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ResearchResultsProps {
  agentId: string;
}

export default function ResearchResults({ agentId }: ResearchResultsProps) {
  const [results, setResults] = useState<AgentResearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AgentResearchResult | null>(null);

  useEffect(() => {
    // Lade Forschungsergebnisse aus dem localStorage
    const savedResults = localStorage.getItem('agent-results');
    if (savedResults) {
      const allResults = JSON.parse(savedResults);
      const agentResults = allResults.filter((result: AgentResearchResult) => result.agentId === agentId);
      setResults(agentResults.sort((a: AgentResearchResult, b: AgentResearchResult) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
  }, [agentId]);

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Noch keine Forschungsergebnisse vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((result) => (
          <div
            key={result.id}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedResult(result)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium text-gray-900">
                Forschungsergebnis
              </h3>
              <span className="text-sm text-gray-500">
                {format(new Date(result.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
              </span>
            </div>
            <p className="text-gray-500 text-sm line-clamp-3">{result.summary}</p>
          </div>
        ))}
      </div>

      {selectedResult && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Forschungsergebnis
                </h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Zusammenfassung
                  </h3>
                  <div className="prose max-w-none">
                    {selectedResult.summary}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Analyse
                  </h3>
                  <div className="prose max-w-none">
                    {selectedResult.analysis}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Quellen
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedResult.sources.map((source, index) => (
                      <li key={index} className="text-gray-500">
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2c2c2c] hover:underline"
                        >
                          {source}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                {selectedResult.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Empfehlungen
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedResult.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-gray-500">
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 