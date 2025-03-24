export interface TextDraft {
  id: number;
  content: string;
  isSelected: boolean;
  title?: string;
  contentType?: string;
  tags?: string[];
  sourceContext?: string;
}

export interface ImageDraft {
  id: number;
  url: string;
  isSelected: boolean;
  title: string;
  contentType?: string;
  tags?: string[];
  sourceContext?: string;
} 