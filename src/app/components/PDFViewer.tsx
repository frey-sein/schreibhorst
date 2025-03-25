'use client';

import { useState, useEffect, useRef } from 'react';

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
}

// PDF.js Viewer Komponente für die sichere Anzeige von PDFs
export default function PDFViewer({ fileUrl, fileName = 'Dokument' }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [scale, setScale] = useState(1.2);
  
  // PDF.js lädt asynchron, verwende einen Ref, um den Status zu verfolgen
  const pdfJsLoaded = useRef(false);
  const scriptsAdded = useRef(false);

  // Funktion zum Laden von PDF.js-Skripts
  useEffect(() => {
    if (scriptsAdded.current) return;
    
    try {
      // Beide Skripte manuell laden
      const loadMainScript = () => {
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/assets/pdf.min.js';
          script.async = true;
          script.onload = () => {
            console.log('PDF.js Hauptskript erfolgreich geladen!');
            resolve();
          };
          script.onerror = () => {
            console.error('Fehler beim Laden des PDF.js Hauptskripts');
            reject(new Error('PDF.js konnte nicht geladen werden'));
          };
          document.head.appendChild(script);
        });
      };
      
      const loadWorkerScript = () => {
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/assets/pdf.worker.min.js';
          script.async = true;
          script.onload = () => {
            console.log('PDF.js Worker-Skript erfolgreich geladen!');
            resolve();
          };
          script.onerror = () => {
            console.error('Fehler beim Laden des PDF.js Worker-Skripts');
            reject(new Error('PDF.js Worker konnte nicht geladen werden'));
          };
          document.head.appendChild(script);
        });
      };
      
      // Beide Skripte laden
      const loadScripts = async () => {
        try {
          // Main PDF.js script laden
          await loadMainScript();
          // Worker script laden (optional, wird oft automatisch geladen)
          await loadWorkerScript().catch(err => {
            console.warn('Worker-Script konnte nicht geladen werden:', err);
            // Kein kritischer Fehler, da wir den Worker-Pfad manuell setzen
          });
          
          scriptsAdded.current = true;
          console.log('Alle PDF.js Skripte wurden geladen!');
        } catch (error) {
          console.error('Fehler beim Laden der PDF.js-Skripte:', error);
          setError('PDF.js konnte nicht geladen werden. Bitte versuchen Sie es später erneut.');
          setIsLoading(false);
        }
      };
      
      loadScripts();
      
    } catch (error) {
      console.error('Initialisierungsfehler PDF.js:', error);
      setError('Fehler bei der Initialisierung der PDF-Anzeige');
      setIsLoading(false);
    }
    
    return () => {
      // Cleanup (optional, da die Skripte im DOM bleiben)
    };
  }, []);

  useEffect(() => {
    let pdfDocumentInstance: any = null;
    let pageRendering = false;
    let pageNumPending: number | null = null;

    // Funktion, um eine bestimmte Seite zu rendern
    const renderPage = (num: number) => {
      if (!pdfDocumentInstance || !canvasRef.current) return;
      
      pageRendering = true;
      
      try {
        // Hole die Seite
        pdfDocumentInstance.getPage(num).then((page: any) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          // Berechne die Viewport-Größe basierend auf der gewünschten Skala
          const viewport = page.getViewport({ scale });
          
          // Passe die Canvas-Dimensionen an
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Render die PDF-Seite im Canvas
          const renderContext = {
            canvasContext: ctx,
            viewport: viewport
          };
          
          const renderTask = page.render(renderContext);
          
          // Warte, bis das Rendering abgeschlossen ist
          renderTask.promise.then(() => {
            pageRendering = false;
            
            if (pageNumPending !== null) {
              // Neue Seite steht aus, rendere diese
              renderPage(pageNumPending);
              pageNumPending = null;
            } else {
              setIsLoading(false);
            }
          }).catch((err: Error) => {
            console.error('Fehler beim Rendern der PDF-Seite:', err);
            setError('Fehler beim Anzeigen der PDF-Seite.');
            setIsLoading(false);
          });
        }).catch((err: Error) => {
          console.error('Fehler beim Laden der Seite:', err);
          setError('Die gewünschte Seite konnte nicht geladen werden.');
          setIsLoading(false);
        });
      } catch (renderError) {
        console.error('Unerwarteter Fehler beim Rendern:', renderError);
        setError('Unerwarteter Fehler beim Rendern der PDF-Seite.');
        setIsLoading(false);
      }
    };

    // Funktion, um eine Seitennummerierung zu verwalten
    const queueRenderPage = (num: number) => {
      if (pageRendering) {
        pageNumPending = num;
      } else {
        renderPage(num);
      }
    };

    // Dient zum Überprüfen, ob PDF.js global verfügbar ist
    const isPdfJsAvailable = () => {
      return typeof window !== 'undefined' && 
             window.pdfjsLib !== undefined;
    };

    // Direkte Prüfung auf die Verfügbarkeit von PDF.js 
    const checkPdfJsAndLoad = () => {
      if (isPdfJsAvailable()) {
        if (!pdfJsLoaded.current) {
          console.log('PDF.js ist verfügbar, initialisiere PDF-Dokument');
          initPdfDocument();
        }
      } else {
        console.log('PDF.js noch nicht verfügbar, warte bis zur nächsten Prüfung');
        // Prüfe nach einer kurzen Verzögerung erneut
        setTimeout(checkPdfJsAndLoad, 500);
      }
    };

    // Initialisierung des PDF-Dokuments
    const initPdfDocument = () => {
      try {
        pdfJsLoaded.current = true;
        console.log('PDF.js wurde erkannt, beginne mit dem Laden des PDF-Dokuments');
        
        const pdfjsLib = window.pdfjsLib;
        
        // Setze den Worker-Pfad manuell
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.js';
          console.log('Worker-Pfad wurde manuell gesetzt');
        }

        // Lade das PDF-Dokument
        console.log('Lade PDF-Dokument von URL:', fileUrl);
        pdfjsLib.getDocument(fileUrl).promise
          .then((pdfDoc: any) => {
            console.log('PDF-Dokument erfolgreich geladen, Seitenanzahl:', pdfDoc.numPages);
            pdfDocumentInstance = pdfDoc;
            setPdfDocument(pdfDoc);
            setNumPages(pdfDoc.numPages);
            
            // Erste Seite anzeigen
            renderPage(pageNum);
          })
          .catch((err: Error) => {
            console.error('Fehler beim Laden des PDFs:', err);
            setError('Das PDF konnte nicht geladen werden. Bitte versuchen Sie, es herunterzuladen.');
            setIsLoading(false);
          });
      } catch (err) {
        console.error('Fehler bei der Initialisierung des PDF-Viewers:', err);
        setError('Der PDF-Viewer konnte nicht initialisiert werden.');
        setIsLoading(false);
      }
    };

    // Starte die Prüfung, sobald die Komponente geladen wird
    if (fileUrl) {
      checkPdfJsAndLoad();
    }

    // Cleanup
    return () => {
      if (pdfDocumentInstance) {
        pdfDocumentInstance = null;
      }
    };
  }, [fileUrl, pageNum, scale]);

  // Navigiert zur vorherigen Seite
  const prevPage = () => {
    if (pageNum <= 1) return;
    setPageNum(pageNum - 1);
  };

  // Navigiert zur nächsten Seite
  const nextPage = () => {
    if (pageNum >= numPages) return;
    setPageNum(pageNum + 1);
  };

  // Zoom-Funktionalität
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  // Direkt herunterladen
  const downloadPdf = () => {
    if (!fileUrl) return;
    
    // Erstelle einen Download-Link
    const link = document.createElement('a');
    link.href = fileUrl + (fileUrl.includes('?') ? '&' : '?') + 'forceDownload=true';
    link.setAttribute('download', fileName || 'dokument.pdf');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-800 text-white">
        <div className="flex items-center space-x-2">
          <button 
            className="bg-gray-700 hover:bg-gray-600 p-1 rounded disabled:opacity-50"
            disabled={pageNum <= 1}
            onClick={prevPage}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm">
            Seite {pageNum} von {numPages || '?'}
          </span>
          <button 
            className="bg-gray-700 hover:bg-gray-600 p-1 rounded disabled:opacity-50"
            disabled={pageNum >= numPages}
            onClick={nextPage}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="font-medium truncate px-2 max-w-[200px]" title={fileName}>
          {fileName}
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
            onClick={zoomOut}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm">
            {Math.round(scale * 100)}%
          </span>
          <button 
            className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
            onClick={zoomIn}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button 
            onClick={downloadPdf}
            className="bg-[#2c2c2c] hover:bg-gray-600 p-1 rounded ml-2"
            title="Herunterladen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF-Anzeigebereich */}
      <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800"></div>
            <p className="text-gray-700">PDF wird geladen...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center p-6 bg-red-50 rounded-lg max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="96" height="96" className="mx-auto mb-4">
              <path fill="#F44336" d="M21.8,30.2L24,32.4l2.2-2.2L30.2,34l1.8-1.8l-3.8-3.8l2.2-2.2l-2.2-2.2l-2.2,2.2L22.2,22.4L20.4,24l3.8,3.8 L21.8,30.2z"/>
              <path fill="#E0E0E0" d="M37,45H11c-1.657,0-3-1.343-3-3V6c0-1.657,1.343-3,3-3h19l10,10v29C40,43.657,38.657,45,37,45z"/>
              <path fill="#FFFFFF" d="M40,13H30V3L40,13z"/>
            </svg>
            <p className="text-gray-800 text-lg font-medium">{error}</p>
            <div className="mt-4">
              <button 
                onClick={downloadPdf}
                className="inline-block px-4 py-2 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
              >
                PDF herunterladen
              </button>
            </div>
          </div>
        )}
        
        <canvas 
          ref={canvasRef} 
          className={`shadow-lg ${isLoading || error ? 'hidden' : 'block'}`}
        ></canvas>
      </div>
    </div>
  );
}

// Erweitere die globale Window-Schnittstelle für PDF.js
declare global {
  interface Window {
    pdfjsLib: any;
  }
} 