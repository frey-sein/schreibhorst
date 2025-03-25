export interface TextDraft {
  id: number;
  content: string;
  title?: string;
  isSelected: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
  meta?: {
    provider?: string;
    author?: string;
    stockImageId?: string;
    licenseInfo?: string;
    tags?: string[];
    [key: string]: any;
  };
} 