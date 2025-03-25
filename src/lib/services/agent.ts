import { Agent, AgentResearchResult } from '@/types/agent';
import { OpenRouterClient } from '../api/openrouter';

export class AgentService {
  private openRouterClient: OpenRouterClient | null = null;
  private activeAgents: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (apiKey) {
        this.openRouterClient = new OpenRouterClient(apiKey);
      }
    } catch (error) {
      console.warn('OpenRouter API nicht verfügbar:', error);
    }
  }

  async startAgent(agent: Agent): Promise<void> {
    if (!agent.schedule) return;

    // Berechne die nächste Ausführungszeit
    const nextExecution = this.calculateNextExecution(agent.schedule);
    const delay = nextExecution.getTime() - Date.now();

    // Setze einen Timer für die regelmäßige Ausführung
    const timer = setTimeout(() => {
      this.executeAgent(agent);
      // Starte den nächsten Zyklus
      this.startAgent(agent);
    }, delay);

    this.activeAgents.set(agent.id, timer);
  }

  stopAgent(agentId: string): void {
    const timer = this.activeAgents.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.activeAgents.delete(agentId);
    }
  }

  private calculateNextExecution(schedule: NonNullable<Agent['schedule']>): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const nextExecution = new Date(now);
    nextExecution.setHours(hours, minutes, 0, 0);

    // Wenn die Zeit heute bereits vorbei ist, berechne die nächste Ausführungszeit
    if (nextExecution <= now) {
      switch (schedule.frequency) {
        case 'daily':
          nextExecution.setDate(nextExecution.getDate() + 1);
          break;
        case 'weekly':
          nextExecution.setDate(nextExecution.getDate() + 7);
          break;
        case 'monthly':
          nextExecution.setMonth(nextExecution.getMonth() + 1);
          break;
      }
    }

    return nextExecution;
  }

  private async executeAgent(agent: Agent): Promise<void> {
    try {
      // Erstelle den Recherche-Prompt
      const prompt = this.createResearchPrompt(agent);

      let researchResult: AgentResearchResult;

      if (this.openRouterClient) {
        // Wenn OpenRouter verfügbar ist, führe die Recherche durch
        let response = '';
        await this.openRouterClient.streamChat(
          [{ role: 'user', content: prompt }],
          'anthropic/claude-3-opus-20240229',
          (chunk) => {
            response += chunk;
          },
          (error) => {
            console.error('Fehler bei der OpenRouter API:', error);
          }
        );

        researchResult = {
          id: crypto.randomUUID(),
          agentId: agent.id,
          summary: response,
          analysis: 'Analyse wird durchgeführt...',
          sources: [],
          recommendations: [],
          createdAt: new Date().toISOString()
        };
      } else {
        // Wenn OpenRouter nicht verfügbar ist, erstelle ein Dummy-Ergebnis
        researchResult = {
          id: crypto.randomUUID(),
          agentId: agent.id,
          summary: 'Recherche konnte nicht durchgeführt werden: OpenRouter API nicht verfügbar',
          analysis: 'Keine Analyse verfügbar',
          sources: [],
          recommendations: [],
          createdAt: new Date().toISOString()
        };
      }

      // Speichere das Ergebnis
      this.saveResearchResult(researchResult);
    } catch (error) {
      console.error('Fehler bei der Agenten-Ausführung:', error);
    }
  }

  private createResearchPrompt(agent: Agent): string {
    return `Führe eine Recherche zu folgenden Themen durch:
${agent.topics.map(topic => `- ${topic}`).join('\n')}

Berücksichtige dabei die folgenden Quellen:
${agent.sources.map(source => `- ${source}`).join('\n')}

Erstelle eine Zusammenfassung der wichtigsten Erkenntnisse und Entwicklungen.`;
  }

  private saveResearchResult(result: AgentResearchResult): void {
    try {
      const savedResults = localStorage.getItem('agent_research_results');
      const results: AgentResearchResult[] = savedResults ? JSON.parse(savedResults) : [];
      results.push(result);
      localStorage.setItem('agent_research_results', JSON.stringify(results));
    } catch (error) {
      console.error('Fehler beim Speichern des Forschungsergebnisses:', error);
    }
  }

  getResearchResults(agentId: string): AgentResearchResult[] {
    try {
      const savedResults = localStorage.getItem('agent_research_results');
      if (!savedResults) return [];
      
      const results: AgentResearchResult[] = JSON.parse(savedResults);
      return results.filter(result => result.agentId === agentId);
    } catch (error) {
      console.error('Fehler beim Laden der Forschungsergebnisse:', error);
      return [];
    }
  }
} 