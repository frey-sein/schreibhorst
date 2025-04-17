export interface TextDraft {
  id: number;
  content: string;
  title?: string;
  isSelected: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  styleVariant?: string;
  contentType?: string;
  tags?: string[];
  sourceContext?: string;
}

export interface BlogPostDraft {
  prompt: string;
  htmlContent: string;
  metaTitle: string;
  metaDescription: string;
  modelId: string;
  createdAt?: Date;
  styleId?: string;
}

export interface ImageDraft {
  id: number;
  url: string;
  title: string;
  prompt?: string;
  isSelected: boolean;
  modelId: string;
  width: number;
  height: number;
  contentType?: string;
  tags?: string[];
  sourceContext?: string;
  status?: 'pending' | 'generating' | 'completed' | 'error';
  meta?: {
    provider?: string;
    author?: string;
    stockImageId?: string;
    licenseInfo?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export interface VideoDraft {
  id: number;
  url?: string;
  title: string;
  prompt?: string;
  isSelected: boolean;
  modelId: string;
  duration: number; // Dauer in Sekunden
  contentType?: string;
  tags?: string[];
  sourceContext?: string;
  status?: 'pending' | 'generating' | 'completed' | 'error';
  jobId?: string; // ID des Runway-Jobs
  meta?: {
    provider?: string;
    format?: string;
    fps?: number;
    tags?: string[];
    [key: string]: any;
  };
} 