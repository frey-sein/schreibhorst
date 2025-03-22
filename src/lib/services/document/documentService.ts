import * as pdfjsLib from 'pdfjs-dist';

export class DocumentService {
  private static instance: DocumentService;
  private workerInitialized = false;

  private constructor() {
    // Initialisiere PDF.js worker nur auf der Client-Seite
    if (typeof window !== 'undefined') {
      this.initializeWorker();
    }
  }

  private initializeWorker() {
    if (!this.workerInitialized) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      this.workerInitialized = true;
    }
  }

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  public async readFileContent(file: File): Promise<string> {
    // Stelle sicher, dass der Worker initialisiert ist
    if (typeof window !== 'undefined') {
      this.initializeWorker();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (event.target?.result) {
          if (file.type === 'application/pdf') {
            try {
              const arrayBuffer = event.target.result as ArrayBuffer;
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              let fullText = '';
              
              // Extrahiere Text aus allen Seiten
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(' ');
                fullText += pageText + '\n\n';
              }
              
              resolve(fullText.trim());
            } catch (error) {
              reject(new Error('Fehler bei der PDF-Verarbeitung'));
            }
          } else if (file.type === 'text/plain') {
            resolve(event.target.result as string);
          } else {
            reject(new Error('Nicht unterstütztes Dateiformat'));
          }
        } else {
          reject(new Error('Fehler beim Lesen der Datei'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Fehler beim Lesen der Datei'));
      };

      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reject(new Error('Nicht unterstütztes Dateiformat'));
      }
    });
  }

  public async processDocument(file: File): Promise<string> {
    try {
      const content = await this.readFileContent(file);
      return content;
    } catch (error) {
      console.error('Fehler bei der Dokumentenverarbeitung:', error);
      throw error;
    }
  }
} 