import { useFileStore } from '@/lib/store/fileStore';
import { FileItem } from '@/types/files';
import { ChevronLeftIcon, FolderPlusIcon, PencilIcon, TrashIcon, EyeIcon, ArrowDownTrayIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';
import ConfirmDialog from './ConfirmDialog';
import PDFViewer from './PDFViewer';
import { useUser } from '../hooks/useUser';
import { DocumentIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

export default function FileList({ className }: { className?: string }) {
  const { 
    getCurrentItems,
    currentPath,
    navigateBack,
    navigateToFolder,
    navigateToRoot,
    navigateToPathIndex,
    getBreadcrumbPath,
    createFolder,
    deleteItem,
    renameItem,
    replaceFile,
    logState
  } = useFileStore();
  
  // User-Berechtigungen
  const { isAdmin } = useUser();

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [itemToRename, setItemToRename] = useState<{ id: string; name: string } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'office' | null>(null);
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  
  const currentItems = getCurrentItems();
  const breadcrumbPath = getBreadcrumbPath();

  // Methode, um den korrekten Pfad für problematische Bild-URLs zu bekommen
  const getThumbnailUrl = (item: FileItem): string => {
    if (!item.url) return '';
    
    // Frühzeitige Überprüfung des Dateinamens - besonders wichtig für die problematische PNG-Datei
    const fileName = item.name.toLowerCase();
    if (fileName.includes('unique-akademie-logo-rgb-300dpi.png')) {
      console.log('PNG-Logo erkannt, ersetze direkt mit JPG-Version');
      return `${window.location.origin}/uploads/1742834060248-unique-akademie-logo-rgb-300dpi.jpg`;
    }
    
    // Bekannte problematische Dateien und ihre funktionierenden Alternativen
    const knownProblematicFiles: Record<string, string> = {
      '/uploads/d063c17f-49be-4d19-957d-738ed68aba84/unique-akademie-logo-rgb-300dpi.jpg': `${window.location.origin}/uploads/1742834060248-unique-akademie-logo-rgb-300dpi.jpg`,
      '/uploads/1742850977929-unique-akademie-logo-rgb-300dpi.png': `${window.location.origin}/uploads/1742834060248-unique-akademie-logo-rgb-300dpi.jpg` // Verwende JPG-Alternative für das PNG
    };
    
    // Direkte Abbildung für bekannte problematische URLs
    if (knownProblematicFiles[item.url]) {
      console.log('Bekannte problematische URL erkannt, verwende direkte Alternative:', knownProblematicFiles[item.url]);
      return knownProblematicFiles[item.url];
    }
    
    // Prüfen auf UUID-Format in der URL
    const uuidPathPattern = /^\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(.+)$/i;
    const match = item.url.match(uuidPathPattern);
    
    if (match) {
      // Bekannte Alternative für problematische Dateien
      const filename = match[2];
      
      // Erweiterte Liste bekannter Alternativen
      const knownFiles: Record<string, string[]> = {
        'unique-akademie-logo-rgb-300dpi.jpg': [
          "1742834060248-unique-akademie-logo-rgb-300dpi.jpg",
          "1742834069695-unique-akademie-logo-rgb-300dpi.jpg"
        ],
        'unique-akademie-logo-rgb-300dpi.png': [
          "1742834060248-unique-akademie-logo-rgb-300dpi.jpg", // JPG-Alternative für PNG
          "1742850977929-unique-akademie-logo-rgb-300dpi.png"  // Original PNG mit Zeitstempel
        ]
      };
      
      // Versuche alle bekannten Varianten des Dateinamens
      for (const [baseFilename, alternatives] of Object.entries(knownFiles)) {
        if (filename.includes(baseFilename) || baseFilename.includes(filename)) {
          for (const alternative of alternatives) {
            // Überprüfe, ob wir eine alternative Datei haben
            console.log(`Versuche Alternative für ${filename}: ${alternative}`);
            return `${window.location.origin}/uploads/${alternative}`;
          }
        }
      }
    }
    
    // Standardfall: Verwende die volle URL
    return getFullUrl(item.url);
  };

  // Hilfsfunktion zum Erkennen von Bitmap-Bildern
  const isBitmapImage = (item: FileItem): boolean => {
    // Prüfe den MIME-Typ
    if (item.mimeType && 
        (item.mimeType.startsWith('image/') && 
         !item.mimeType.includes('svg'))) {
      return true;
    }
    
    // Alternativ: Prüfe die Dateiendung
    const filename = item.name.toLowerCase();
    return (
      filename.endsWith('.jpg') || 
      filename.endsWith('.jpeg') || 
      filename.endsWith('.png') || 
      filename.endsWith('.gif') || 
      filename.endsWith('.webp') ||
      filename.endsWith('.bmp')
    );
  };

  // Hilfsfunktion zum Erkennen von SVG-Bildern
  const isSvgImage = (item: FileItem): boolean => {
    // Prüfe den MIME-Typ
    if (item.mimeType && item.mimeType.includes('svg')) {
      return true;
    }
    
    // Alternativ: Prüfe die Dateiendung
    return item.name.toLowerCase().endsWith('.svg');
  };

  // Hilfsfunktion zum Erkennen aller Bildtypen (inkl. Bitmap und SVG)
  const isImageFile = (item: FileItem): boolean => {
    return isBitmapImage(item) || isSvgImage(item);
  };

  // Debugging
  useEffect(() => {
    logState();
  }, [currentPath, logState]);

  // Verbesserte Funktion für den direkten Dateizugriff mit spezieller PDF-Behandlung
  const getDirectFileUrl = (item: FileItem): string => {
    if (!item.url) return '';
    
    // URL für die API-Route erstellen
    let apiUrl = '';
    let queryParams = '';
    
    // Prüfen ob es sich um eine PDF handelt (für bessere Anzeige)
    const isPdf = item.name.toLowerCase().endsWith('.pdf') || 
                (item.mimeType && item.mimeType.includes('pdf'));
    
    // Für PDFs keine Download-Parameter hinzufügen, es sei denn es wird explizit angefordert
    const needsForceDownload = !isPdf;
    
    // Fall 1: URL enthält bereits einen Zeitstempel (format: /uploads/1234567890-filename.ext)
    const timestampMatch = item.url.match(/\/uploads\/(\d+)-(.+)$/i);
    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      const filename = timestampMatch[2];
      apiUrl = `/api/files/${timestamp}-${filename}`;
      console.log(`Timestamp-basierte URL erkannt: ${timestamp}-${filename}`);
    }
    // Fall 2: URL enthält eine UUID (format: /uploads/uuid/filename.ext)
    else if (item.url.includes('/uploads/')) {
      // Extrahiere den Dateinamen aus dem URL-Pfad
      const parts = item.url.split('/');
      const filename = parts[parts.length - 1];
      
      // Verwende den Dateinamen als Identifikator
      apiUrl = `/api/files/${filename}`;
      console.log(`URL mit Pfad erkannt, extrahiere Dateinamen: ${filename}`);
    }
    // Fall 3: Spezielle URLs für DSGVO-Dokumente
    else if (item.name.toLowerCase().includes('datenschutz') || 
             item.name.toLowerCase().includes('dsgvo') ||
             item.name.toLowerCase().includes('promt')) {
      
      // Für DSGVO-Dokumente: Verwende exakt den Namen mit der richtigen Groß-/Kleinschreibung
      // Ersetze "datenschutz" mit "Datenschutz" für den Dokument-Namen
      let fixedName = item.name;
      if (item.name.toLowerCase().includes('datenschutz') && !item.name.includes('Datenschutz')) {
        fixedName = item.name.replace(/datenschutz/i, 'Datenschutz');
        console.log(`Korrigiere Groß-/Kleinschreibung: "${item.name}" -> "${fixedName}"`);
      }
      
      // Ebenso "anonymisierung" mit "Anonymisierung"
      if (fixedName.toLowerCase().includes('anonymisierung') && !fixedName.includes('Anonymisierung')) {
        fixedName = fixedName.replace(/anonymisierung/i, 'Anonymisierung');
        console.log(`Korrigiere Groß-/Kleinschreibung: "${item.name}" -> "${fixedName}"`);
      }
      
      apiUrl = `/api/files/${fixedName}`;
      console.log(`DSGVO-Dokument erkannt: ${fixedName}`);
    }
    // Fall 4: Fallback für unbekannte Formate
    else {
      apiUrl = `/api/files/${item.name}`;
      console.log(`Unbekanntes URL-Format, verwende Dateiname: ${item.name}`);
    }
    
    // Füge Query-Parameter hinzu, falls benötigt
    if (needsForceDownload) {
      queryParams = '?download=1&forceDownload=true';
    }
    
    return apiUrl + queryParams;
  };

  // Spezielle Funktion für die PDF-Vorschau
  const getPdfPreviewUrl = (item: FileItem): string => {
    if (!item.url) return '';
    
    // Basisurl ohne Download-Parameter erstellen
    let baseUrl = '';
    
    // Fall 1: URL enthält bereits einen Zeitstempel (format: /uploads/1234567890-filename.ext)
    const timestampMatch = item.url.match(/\/uploads\/(\d+)-(.+)$/i);
    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      const filename = timestampMatch[2];
      baseUrl = `/api/files/${timestamp}-${filename}`;
    }
    // Fall 2: URL enthält eine UUID oder anderen Pfad
    else if (item.url.includes('/uploads/')) {
      // Extrahiere den Dateinamen aus dem URL-Pfad
      const parts = item.url.split('/');
      const filename = parts[parts.length - 1];
      baseUrl = `/api/files/${filename}`;
    }
    // Fall 3: Direkter Dateiname
    else {
      baseUrl = `/api/files/${item.name}`;
    }
    
    console.log('PDF-Vorschau URL:', baseUrl);
    return baseUrl;
  };

  // Modifizierte Funktion zum Herunterladen einer Datei
  const handleDownload = (item: FileItem) => {
    if (!item.url) {
      console.error('Download fehlgeschlagen: Keine URL vorhanden');
      return;
    }
    
    console.log('Starte Download für:', item.name, 'URL:', item.url);
    
    // API-basierte URL generieren für den direkten Dateizugriff
    const directFileUrl = getDirectFileUrl(item);
    console.log('Verwende API-basierte URL für direkten Dateizugriff:', directFileUrl);
    
    // Bestimme den Dateityp
    const fileName = item.name.toLowerCase();
    const isOfficeDoc = fileName.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) !== null;
    
    // Für Office-Dokumente: Zusätzliche Parameter für erzwungenen Download
    const downloadUrl = directFileUrl;
    
    // Download-Link erstellen und klicken
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', item.name);
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    
    // Zum DOM hinzufügen und klicken
    document.body.appendChild(link);
    link.click();
    
    // Nach dem Download aufräumen
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setError(null);
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderDialog(false);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Fehler beim Erstellen des Ordners');
      }
      console.error('Fehler beim Erstellen des Ordners:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const itemToRemove = currentItems.find(item => item.id === id);
    if (itemToRemove) {
      setItemToDelete(itemToRemove);
      setShowDeleteConfirm(true);
    }
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setError(null);
      await deleteItem(itemToDelete.id);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      
      // Zeige die Fehlermeldung abhängig vom Fehlertyp
      let errorMessage = 'Fehler beim Löschen des Elements';
      
      if (error instanceof Error) {
        // Spezielle Behandlung für häufige Fehlertypen
        if (error.message.includes('not found') || error.message.includes('nicht gefunden')) {
          // Informiere den Benutzer über erfolgreiche lokale Entfernung
          errorMessage = 'Das Element existierte nicht mehr auf dem Server, wurde aber lokal entfernt.';
          
          // Kurz Fehlermeldung anzeigen und dann verstecken
          setError(errorMessage);
          setTimeout(() => setError(null), 3000);
          
          // Dialog schließen
          setShowDeleteConfirm(false);
          setItemToDelete(null);
          return;
        } else {
          // Andere Fehlertypen
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleRename = (id: string, name: string) => {
    setItemToRename({ id, name });
    setNewItemName(name);
    setShowRenameDialog(true);
    setError(null);
  };

  const submitRename = async () => {
    if (!itemToRename || !newItemName.trim()) return;
    
    try {
      setError(null);
      await renameItem(itemToRename.id, newItemName.trim());
      setItemToRename(null);
      setNewItemName('');
      setShowRenameDialog(false);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Fehler beim Umbenennen');
      }
      console.error('Fehler beim Umbenennen:', error);
    }
  };

  const handlePreview = (item: FileItem) => {
    if (item.type !== 'file') return;
    
    setPreviewItem(item);
    setPreviewError(null);
    
    // URL für die Vorschau festlegen
    const url = getDirectFileUrl(item);
    setPreviewUrl(url);
    
    // Typ der Vorschau basierend auf der Dateierweiterung festlegen
    if (isBitmapImage(item) || isSvgImage(item)) {
      setPreviewType('image');
    } else if (item.name.match(/\.(pdf)$/i)) {
      setPreviewType('pdf');
    } else if (item.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) {
      setPreviewType('office');
    } else {
      setPreviewType(null);
    }
  };

  // Vereinfachte Funktion zum Konstruieren von absoluten URLs
  const getFullUrl = (url: string) => {
    // Wenn die URL bereits absolut ist, verwenden wir sie direkt
    if (url.startsWith('http')) {
      return url;
    }

    // Bekannte funktionierende Logo-URL
    const funktionierendeLogoUrl = `${window.location.origin}/uploads/1742834060248-unique-akademie-logo-rgb-300dpi.jpg`;
    
    // Für alle problematischen Logo-URLs
    if (url.includes('unique-akademie-logo-rgb-300dpi')) {
      console.log('Bekannte problematische Logo-URL erkannt, verwende direkte Alternative');
      return funktionierendeLogoUrl;
    }
    
    // Prüfe, ob es sich um eine URL mit UUIDs handelt und korrigiere diese
    const uuidRegex = /\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(.+)$/i;
    const uuidMatch = url.match(uuidRegex);
    
    if (uuidMatch) {
      // Extrahiere den Dateinamen
      const filename = uuidMatch[2];
      console.log('URL mit UUID erkannt, verwende vereinfachten Pfad für:', filename);
      
      // Erstelle einen vereinfachten Pfad ohne UUID
      const simplifiedUrl = `/uploads/${filename}`;
      
      // Standard-Fall: Füge den Origin hinzu
      const baseUrl = window.location.origin;
      return `${baseUrl}${simplifiedUrl}`;
    }
    
    // Überprüfe auf Zeitstempel-Format (für Office-Dokumente)
    const timestampRegex = /\/uploads\/(\d+)-(.+)$/i;
    const timestampMatch = url.match(timestampRegex);
    
    if (timestampMatch) {
      // Extrahiere Zeitstempel und Dateinamen
      const timestamp = timestampMatch[1];
      const filename = timestampMatch[2];
      
      console.log(`Zeitstempel-URL erkannt: ${timestamp}-${filename}`);
      
      // Verwende die vollständige URL mit Zeitstempel
      const fullUrl = `${window.location.origin}/uploads/${timestamp}-${filename}`;
      console.log('Verwende vollständige URL:', fullUrl);
      return fullUrl;
    }

    // Standard-Fall: Füge einfach den Origin hinzu
    const baseUrl = window.location.origin;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  // Funktion zum Ersetzen einer Datei
  const handleReplace = (id: string, name: string) => {
    setReplacingItemId(id);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Funktion zum Verarbeiten der ausgewählten Ersatzdatei
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !replacingItemId) return;
    
    const file = files[0];
    const item = currentItems.find(item => item.id === replacingItemId);
    
    if (!item) {
      setError('Datei nicht gefunden');
      return;
    }

    // Extrahiere Dateiname und -typ
    const originalName = item.name;
    const originalExtension = originalName.split('.').pop()?.toLowerCase() || '';
    const newFileName = file.name;
    const newExtension = newFileName.split('.').pop()?.toLowerCase() || '';

    // Prüfe, ob die Dateierweiterung übereinstimmt
    if (newExtension !== originalExtension) {
      setError(`Dateityp muss ${originalExtension} sein. Hochgeladene Datei ist ${newExtension}`);
      return;
    }

    try {
      setError(null);
      setIsReplacing(true);
      await replaceFile(replacingItemId, file);
      setReplacingItemId(null);
    } catch (error) {
      console.error('Fehler beim Ersetzen der Datei:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Fehler beim Ersetzen der Datei');
      }
    } finally {
      setIsReplacing(false);
    }
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      navigateToFolder(item.id);
    } else {
      // Für Dateien: Aktionsdialog anzeigen
      setSelectedItem(item);
      setShowActionDialog(true);
    }
  };

  // Verwende die getDirectFileUrl-Funktion auch für Vorschaubilder
  useEffect(() => {
    if (previewUrl && selectedItem) {
      // Verwende die neue direkte API-Route für Dateizugriffe
      console.log('Aktualisiere Vorschau-URL mit direktem API-Zugriff');
      const directUrl = getDirectFileUrl(selectedItem);
      console.log('Direkte API-URL für Vorschau:', directUrl);
      
      // Aktualisiere alle relevanten DOM-Elemente mit der neuen URL
      const previewImages = document.querySelectorAll('[data-preview-element="true"]');
      previewImages.forEach(element => {
        if (element instanceof HTMLImageElement || element instanceof HTMLIFrameElement) {
          // Keine leeren Strings als src setzen
          if (directUrl) {
            element.src = directUrl;
          } else {
            element.src = 'about:blank';
          }
        } else if (element instanceof HTMLAnchorElement) {
          element.href = directUrl || '#';
        }
      });
    }
  }, [previewUrl, selectedItem]);

  useEffect(() => {
    if (previewUrl && previewType === 'pdf') {
      // Errichte einen Timeout, um zu überprüfen, ob das PDF geladen wurde
      const timeoutId = setTimeout(() => {
        // Prüfe, ob im PDF-Container ein Fehler auftritt
        const pdfContainer = document.querySelector('.pdf-container');
        if (!pdfContainer || pdfContainer.querySelector('.pdf-error')) {
          setPreviewError('PDF konnte nicht geladen werden. Bitte versuchen Sie, es herunterzuladen.');
        }
      }, 5000); // 5 Sekunden Timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [previewUrl, previewType]);

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center">
          <span className="bg-gray-100 p-1.5 rounded-lg mr-3">
            <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </span>
          Dateien
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setError(null);
              setShowNewFolderDialog(true);
            }}
            className="px-4 py-2 bg-[#2c2c2c] text-white rounded-full hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <FolderPlusIcon className="h-5 w-5" />
            Neuer Ordner
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl bg-white shadow-sm">
        {/* Header mit Breadcrumb */}
        <div className="sticky top-0 z-10 flex justify-between items-start p-4 border-b border-gray-200 bg-white">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-500 px-2 py-1.5 bg-gray-50 rounded-lg max-w-full overflow-x-auto">
            {breadcrumbPath.map((folder, index) => (
              <div key={`breadcrumb-${folder.id}-${index}`} className="flex items-center whitespace-nowrap">
                {index > 0 && <span key={`breadcrumb-separator-${index}`} className="mx-2 text-gray-400">/</span>}
                <button
                  onClick={() => {
                    if (index === 0) {
                      navigateToRoot();
                    } else {
                      navigateToPathIndex(index);
                    }
                  }}
                  className={`hover:text-gray-900 transition-colors ${index === breadcrumbPath.length - 1 ? 'font-medium text-gray-900' : ''}`}
                  key={`breadcrumb-button-${folder.id}-${index}`}
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Neuer Ordner Dialog */}
        {showNewFolderDialog && (
          <div className="m-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-medium text-gray-800">Neuen Ordner erstellen</h3>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Name für neuen Ordner"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-[#2c2c2c] placeholder-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') {
                      setShowNewFolderDialog(false);
                      setError(null);
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-4 py-2.5 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium shadow-sm"
                >
                  Erstellen
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderDialog(false);
                    setNewFolderName('');
                    setError(null);
                  }}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-200"
                >
                  Abbrechen
                </button>
              </div>
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Umbenennen Dialog */}
        {showRenameDialog && (
          <div className="m-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-medium text-gray-800">Element umbenennen</h3>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Neuer Name"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 text-[#2c2c2c] placeholder-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') {
                      setShowRenameDialog(false);
                      setItemToRename(null);
                      setError(null);
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={submitRename}
                  className="px-4 py-2.5 bg-[#2c2c2c] text-white rounded-lg hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2c2c2c]/20 transition-all text-sm font-medium shadow-sm"
                >
                  Umbenennen
                </button>
                <button
                  onClick={() => {
                    setShowRenameDialog(false);
                    setItemToRename(null);
                    setError(null);
                  }}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm font-medium border border-gray-200"
                >
                  Abbrechen
                </button>
              </div>
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fehleranzeige */}
        {error && !showNewFolderDialog && !showRenameDialog && (
          <div className="m-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 shadow-sm"
               dangerouslySetInnerHTML={{ __html: error }}>
          </div>
        )}

        {/* Zurück-Link */}
        {currentPath.length > 1 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <button
              onClick={navigateBack}
              className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1.5 transition-colors bg-gray-50 px-3 py-1.5 rounded-md hover:bg-gray-100"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Zurück</span>
            </button>
          </div>
        )}

        {/* Datei- und Ordnerliste */}
        <div className="p-4 grid grid-cols-1 gap-3">
          {currentItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mx-auto mb-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <p className="text-gray-500">Dieser Ordner ist leer.</p>
            </div>
          ) : (
            currentItems
              .sort((a, b) => {
                // Ordner vor Dateien
                if (a.type !== b.type) {
                  return a.type === 'folder' ? -1 : 1;
                }
                // Alphabetisch innerhalb des gleichen Typs
                return a.name.localeCompare(b.name);
              })
              .map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 border rounded-xl hover:shadow-md transition-all group ${
                    item.type === 'folder' 
                      ? 'bg-[#fbfbfb] border-gray-200 hover:bg-[#f7f7f7]' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    {item.type === 'folder' ? (
                      <div className="bg-[#f2f2f2] p-2 rounded-lg">
                        <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                      </div>
                    ) : (
                      <>
                        {/* Thumbnail für Bilddateien */}
                        {item.url && isImageFile(item) ? (
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center bg-white shadow-sm">
                            <img 
                              src={getThumbnailUrl(item)} 
                              alt={item.name}
                              className="h-full w-full object-contain bg-white"
                              loading="lazy"
                              onError={(e) => {
                                // Error handling code...
                              }}
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-100 p-2 rounded-lg">
                            <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-gray-800 font-medium truncate block">{item.name}</span>
                      <span className="text-xs text-gray-500">
                        {item.type === 'folder' ? 'Ordner' : item.mimeType || 'Datei'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Aktionen */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Vorschau-Button für alle Benutzer */}
                    {item.type === 'file' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(item);
                          }}
                          className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm"
                          title="Vorschau"
                        >
                          <EyeIcon className="h-4 w-4 text-gray-600" />
                        </button>

                        {/* Download-Button für alle Benutzer */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item);
                          }}
                          className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm"
                          title="Herunterladen"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 text-gray-600" />
                        </button>

                        {/* Ersetzen-Button nur für Admins */}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReplace(item.id, item.name);
                            }}
                            className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm"
                            title="Datei ersetzen"
                            disabled={isReplacing}
                          >
                            <ArrowPathIcon className="h-4 w-4 text-gray-600" />
                          </button>
                        )}
                      </>
                    )}
                    
                    {/* Umbenennen-Button für Ordner nur für Admins */}
                    {item.type === 'folder' && isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(item.id, item.name);
                        }}
                        className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm"
                        title="Umbenennen"
                      >
                        <PencilIcon className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                    
                    {/* Löschen-Button für beide Typen nur für Admins */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm"
                        title="Löschen"
                      >
                        <TrashIcon className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Verstecktes Datei-Input für Dateiersetzung */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileSelected}
      />

      {/* Vorschau-Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-white rounded-lg overflow-auto max-w-5xl w-[95%] max-h-[95vh] relative">
            <div className="sticky top-0 z-10 bg-white px-4 py-3 flex justify-between items-center border-b">
              <h3 className="text-lg font-medium text-gray-800">
                Vorschau: {previewItem?.name}
              </h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Bildvorschau */}
              {previewType === 'image' && (
                <div className="flex flex-col items-center">
                  <img
                    src={previewUrl}
                    alt={previewItem?.name || 'Vorschau'}
                    className="max-w-full max-h-[70vh] object-contain"
                    onError={() => setPreviewError('Bild konnte nicht geladen werden.')}
                  />
                  {previewError && (
                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg">
                      {previewError}
                    </div>
                  )}
                </div>
              )}
              
              {/* PDF-Vorschau */}
              {previewType === 'pdf' && (
                <div className="flex flex-col">
                  <div className="h-[70vh]">
                    <PDFViewer
                      fileUrl={previewUrl}
                      fileName={previewItem?.name || 'Dokument'}
                    />
                  </div>
                  
                  {previewError && (
                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg">
                      {previewError}
                      <div className="mt-2">
                        <a 
                          href={previewUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          PDF direkt öffnen
                        </a>
                        {' oder '}
                        <a 
                          href={previewUrl} 
                          download
                          className="text-blue-600 hover:underline"
                        >
                          herunterladen
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Office-Dokument oder andere nicht unterstützte Vorschau */}
              {previewType === 'office' && (
                <div className="p-6 text-center">
                  <div className="mb-4">
                    <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Vorschau nicht verfügbar
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Leider ist für diese Datei keine Vorschau verfügbar.
                  </p>
                  <div className="flex justify-center gap-4">
                    <a
                      href={previewUrl}
                      download
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                      Herunterladen
                    </a>
                  </div>
                </div>
              )}
              
              {/* Unbekannte Datei */}
              {!previewType && (
                <div className="p-6 text-center">
                  <div className="mb-4">
                    <QuestionMarkCircleIcon className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Unbekannter Dateityp
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Diese Datei kann nicht angezeigt werden.
                  </p>
                  <div className="flex justify-center gap-4">
                    <a
                      href={previewUrl}
                      download
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                      Herunterladen
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aktionsdialog für Dateien */}
      {showActionDialog && selectedItem && selectedItem.type === 'file' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg overflow-hidden max-w-md w-full max-h-[90vh] relative p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              Aktionen für "{selectedItem.name}"
            </h3>
            
            <div className="space-y-4 mt-4">
              {/* Vorschau - für alle Benutzer */}
              <button 
                onClick={() => {
                  handlePreview(selectedItem);
                  setShowActionDialog(false);
                }}
                className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors text-left"
              >
                <EyeIcon className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-800">Vorschau</p>
                  <p className="text-sm text-gray-500">Dateivorschau anzeigen (wenn verfügbar)</p>
                </div>
              </button>
              
              {/* Herunterladen - für alle Benutzer */}
              <button 
                onClick={() => {
                  handleDownload(selectedItem);
                  // Dialog nicht sofort schließen, um den Download zu ermöglichen
                  setTimeout(() => {
                    setShowActionDialog(false);
                  }, 300);
                }}
                className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors text-left"
              >
                <ArrowDownTrayIcon className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-800">Herunterladen</p>
                  <p className="text-sm text-gray-500">Datei auf Ihren Computer speichern</p>
                </div>
              </button>
              
              {/* Ersetzen - nur für Admins */}
              {isAdmin && (
                <button 
                  onClick={() => {
                    handleReplace(selectedItem.id, selectedItem.name);
                    setShowActionDialog(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors text-left"
                  disabled={isReplacing}
                >
                  <ArrowPathIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">Ersetzen</p>
                    <p className="text-sm text-gray-500">Datei durch eine neue Version ersetzen</p>
                  </div>
                </button>
              )}
              
              {/* Löschen - nur für Admins */}
              {isAdmin && (
                <button 
                  onClick={() => {
                    handleDelete(selectedItem.id);
                    setShowActionDialog(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors text-left"
                >
                  <TrashIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-800">Löschen</p>
                    <p className="text-sm text-gray-500">Datei unwiderruflich entfernen</p>
                  </div>
                </button>
              )}
            </div>
            
            {/* Schließen-Button */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowActionDialog(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors font-medium"
              >
                Schließen
              </button>
            </div>
            
            {/* X-Button in der Ecke */}
            <button 
              className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 rounded-full p-2 text-gray-700 transition-colors"
              onClick={() => setShowActionDialog(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bestätigungsdialog für das Löschen */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={`${itemToDelete?.type === 'folder' ? 'Ordner' : 'Datei'} löschen`}
        message={itemToDelete ? `Möchten Sie "${itemToDelete.name}" wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.` : 'Möchten Sie dieses Element wirklich löschen?'}
        confirmText="Löschen"
        cancelText="Abbrechen"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </div>
  );
} 