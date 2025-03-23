import * as XLSX from 'xlsx';
import { CHAT_CONSTANTS } from '@/lib/constants/chat';

export class FileProcessor {
  private static instance: FileProcessor | null = null;

  private constructor() {}

  public static getInstance(): FileProcessor {
    if (!FileProcessor.instance) {
      FileProcessor.instance = new FileProcessor();
    }
    return FileProcessor.instance;
  }

  private async processExcel(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(JSON.stringify(jsonData, null, 2));
        } catch (error) {
          reject(new Error('Fehler beim Verarbeiten der Excel-Datei'));
        }
      };

      reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async processText(file: File): Promise<string> {
    return file.text();
  }

  private async processMarkdown(file: File): Promise<string> {
    const text = await file.text();
    // Hier könnte zusätzliche Markdown-Verarbeitung hinzugefügt werden
    return text;
  }

  public async processFile(file: File): Promise<string> {
    const fileHandlers: Record<string, (file: File) => Promise<string>> = {
      'text/plain': this.processText,
      'text/markdown': this.processMarkdown,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': this.processExcel,
      'application/vnd.ms-excel': this.processExcel,
    };

    const handler = fileHandlers[file.type];
    if (!handler) {
      throw new Error(CHAT_CONSTANTS.ERROR_MESSAGES.FILE_FORMAT);
    }

    return handler.call(this, file);
  }

  public isValidFileType(file: File): boolean {
    const validTypes = [
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    return validTypes.includes(file.type);
  }
} 