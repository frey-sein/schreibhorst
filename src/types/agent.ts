export interface Agent {
  id: string;
  name: string;
  title: string;
  avatar?: string;
  description: string;
  topics: string[];
  sources: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    days?: number[]; // 0 = Montag, 6 = Sonntag
  };
  createdAt: string;
  updatedAt: string;
}

export interface AgentResearchResult {
  id: string;
  agentId: string;
  summary: string;
  analysis: string;
  sources: string[];
  recommendations: string[];
  createdAt: string;
} 