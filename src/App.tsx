/**
 * PDF Page Master - Main Application
 * Tier 1: Reorder, Rotate, Split/Download, Duplicate, Multi-Select
 * Tier 2: Page Numbers, Watermark, Sign, Redact, Form Fill
 * Tier 3: Bookmarks, Text/Highlight, Compress, Headers/Footers, Image↔PDF
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getPdfPages, mergePdfPages, downloadPdf, clearAllFileData,
  duplicatePageInfo, downloadSinglePage, imageToPageInfo,
  downloadAllPagesAsImages, storeFileData, getAllFileEntries,
  type PageInfo, type ExportOptions,
} from './lib/pdfService';
import { hasSavedSession, saveSession, loadSession, clearSession, type SessionData } from './lib/sessionStore';
import type { Annotation, PageNumberSettings, WatermarkSettings, Bookmark, HeaderFooterSettings } from './lib/types';
import { DEFAULT_PAGE_NUM_SETTINGS, DEFAULT_WATERMARK_SETTINGS, DEFAULT_HEADER_FOOTER } from './lib/types';
import Modal from './components/Modal';
import SignaturePad from './components/SignaturePad';
import PageNumberConfig from './components/PageNumberConfig';
import WatermarkConfig from './components/WatermarkConfig';
import BookmarkEditor from './components/BookmarkEditor';
import HeaderFooterConfig from './components/HeaderFooterConfig';
import AboutModal from './components/AboutModal';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MainContent from './components/MainContent';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export default function App() {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom
  const [zoom, setZoom] = useState(100);
  const ZOOM_MIN = 40, ZOOM_MAX = 200, ZOOM_STEP = 20;
  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  const zoomReset = () => setZoom(100);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const selectedCount = selectedIds.size;

  // Drag reorder
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);

  // Tier 2+3 State
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({});
  const [pageNumSettings, setPageNumSettings] = useState<PageNumberSettings>(DEFAULT_PAGE_NUM_SETTINGS);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(DEFAULT_WATERMARK_SETTINGS);
  const [headerFooter, setHeaderFooter] = useState<HeaderFooterSettings>(DEFAULT_HEADER_FOOTER);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'signature' | 'redaction' | 'text' | 'highlight' | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [fillingFormPageId, setFillingFormPageId] = useState<string | null>(null);
  const [sigTargetPageId, setSigTargetPageId] = useState<string | null>(null);
  const [compression, setCompression] = useState<'none' | 'medium' | 'high'>('none');

  // Session recovery
  const [recoveryInfo, setRecoveryInfo] = useState<{ savedAt: number; pageCount: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  // ─── Session: Check for recovery on mount ───────────────
  useEffect(() => {
    hasSavedSession().then((info) => {
      if (info.exists) setRecoveryInfo({ savedAt: info.savedAt, pageCount: info.pageCount });
      hasLoadedRef.current = true;
    });
  }, []);

  // ─── Session: Debounced auto-save (2s) ──────────────────
  useEffect(() => {
    if (!hasLoadedRef.current || pages.length === 0) return;
    if (recoveryInfo) return; // Don't overwrite while recovery banner is showing

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const data: SessionData = {
          version: 1, savedAt: Date.now(), pages, annotations,
          pageNumSettings, watermarkSettings, headerFooter,
          bookmarks, formValues, compression, zoom,
        };
        await saveSession(data, getAllFileEntries());
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('idle');
      }
    }, 2000);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [pages, annotations, pageNumSettings, watermarkSettings, headerFooter, bookmarks, formValues, compression, zoom, recoveryInfo]);

  // ─── Session: Restore ───────────────────────────────────
  const restoreSession = useCallback(async () => {
    setIsProcessing(true);
    try {
      const saved = await loadSession();
      if (!saved) { setRecoveryInfo(null); setIsProcessing(false); return; }
      // Restore file data into in-memory store
      for (const [id, bytes] of saved.files) storeFileData(id, bytes);
      // Restore all state
      setPages(saved.data.pages);
      setAnnotations(saved.data.annotations || {});
      setPageNumSettings(saved.data.pageNumSettings || DEFAULT_PAGE_NUM_SETTINGS);
      setWatermarkSettings(saved.data.watermarkSettings || DEFAULT_WATERMARK_SETTINGS);
      setHeaderFooter(saved.data.headerFooter || DEFAULT_HEADER_FOOTER);
      setBookmarks(saved.data.bookmarks || []);
      setFormValues(saved.data.formValues || {});
      setCompression((saved.data.compression as any) || 'none');
      if (saved.data.zoom) setZoom(saved.data.zoom);
      setRecoveryInfo(null);
    } catch (err) {
      console.error('Session restore failed:', err);
      alert('Failed to restore session. Starting fresh.');
      setRecoveryInfo(null);
    } finally { setIsProcessing(false); }
  }, []);

  const discardSession = useCallback(async () => {
    await clearSession();
    setRecoveryInfo(null);
  }, []);

  // ─── Annotation helpers ─────────────────────────────────
  const addAnnotation = useCallback((pageId: string, ann: Annotation) => {
    setAnnotations((prev) => ({ ...prev, [pageId]: [...(prev[pageId] || []), ann] }));
  }, []);
  const removeAnnotation = useCallback((pageId: string, annId: string) => {
    setAnnotations((prev) => ({ ...prev, [pageId]: (prev[pageId] || []).filter((a) => a.id !== annId) }));
  }, []);

  const startSigning = (pageId: string) => { setSigTargetPageId(pageId); setActiveModal('signature'); };
  const handleSignatureSave = (dataUrl: string) => {
    setSignatureImage(dataUrl); setActiveModal(null);
    if (sigTargetPageId) { setEditingPageId(sigTargetPageId); setEditMode('signature'); }
  };
  const startRedacting = (pageId: string) => { setEditingPageId(pageId); setEditMode('redaction'); };
  const startTextAnnotation = (pageId: string) => { setEditingPageId(pageId); setEditMode('text'); };
  const startHighlighting = (pageId: string) => { setEditingPageId(pageId); setEditMode('highlight'); };
  const finishEditing = () => { setEditingPageId(null); setEditMode(null); };

  const setFormFieldValue = (pageId: string, fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [pageId]: { ...(prev[pageId] || {}), [fieldName]: value } }));
  };

  // ─── Selection ──────────────────────────────────────────
  const toggleSelection = useCallback((id: string, index: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIndex !== null) {
        for (let i = Math.min(lastSelectedIndex, index); i <= Math.max(lastSelectedIndex, index); i++) next.add(pages[i].id);
      } else { next.has(id) ? next.delete(id) : next.add(id); }
      return next;
    });
    setLastSelectedIndex(index);
    if (!selectionMode) setSelectionMode(true);
  }, [lastSelectedIndex, pages, selectionMode]);
  const selectAll = () => { setSelectedIds(new Set(pages.map((p) => p.id))); setSelectionMode(true); };
  const deselectAll = () => { setSelectedIds(new Set()); setLastSelectedIndex(null); };
  const exitSelectionMode = () => { deselectAll(); setSelectionMode(false); };

  // ─── File Handling (PDF + Images) ───────────────────────
  const handleFiles = useCallback(async (newFiles: FileList | null) => {
    if (!newFiles || !newFiles.length) return;
    setIsProcessing(true);
    try {
      const allNew: PageInfo[] = [];
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        if (file.type === 'application/pdf') {
          allNew.push(...await getPdfPages(file));
        } else if (IMAGE_TYPES.includes(file.type)) {
          allNew.push(await imageToPageInfo(file));
        }
      }
      if (allNew.length) setPages((prev) => [...prev, ...allNew]);
    } catch (err) {
      alert(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // ─── Page Actions ───────────────────────────────────────
  const removePage = (id: string) => { setPages((p) => p.filter((x) => x.id !== id)); setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; }); };
  const removeSelected = () => { setPages((p) => p.filter((x) => !selectedIds.has(x.id))); exitSelectionMode(); };
  const clearAll = () => { setPages([]); clearAllFileData(); exitSelectionMode(); setAnnotations({}); setFormValues({}); setBookmarks([]); clearSession(); };

  const rotatePage = (id: string, dir: 'cw' | 'ccw') => setPages((p) => p.map((x) => x.id !== id ? x : { ...x, rotation: ((x.rotation + (dir === 'cw' ? 90 : -90)) % 360 + 360) % 360 }));
  const rotateSelected = (dir: 'cw' | 'ccw') => setPages((p) => p.map((x) => !selectedIds.has(x.id) ? x : { ...x, rotation: ((x.rotation + (dir === 'cw' ? 90 : -90)) % 360 + 360) % 360 }));
  const duplicatePage = (id: string) => setPages((p) => { const i = p.findIndex((x) => x.id === id); if (i < 0) return p; const n = [...p]; n.splice(i + 1, 0, duplicatePageInfo(p[i])); return n; });
  const duplicateSelected = () => { setPages((p) => { const n = [...p]; p.map((x, i) => selectedIds.has(x.id) ? i : -1).filter((i) => i >= 0).reverse().forEach((i) => n.splice(i + 1, 0, duplicatePageInfo(n[i]))); return n; }); exitSelectionMode(); };
  const moveSelectedToTop = () => setPages((p) => [...p.filter((x) => selectedIds.has(x.id)), ...p.filter((x) => !selectedIds.has(x.id))]);
  const moveSelectedToBottom = () => setPages((p) => [...p.filter((x) => !selectedIds.has(x.id)), ...p.filter((x) => selectedIds.has(x.id))]);

  const handleDownloadPage = async (page: PageInfo) => { setIsProcessing(true); try { await downloadSinglePage(page); } catch (e) { alert(`Download failed: ${e instanceof Error ? e.message : 'Unknown'}`); } finally { setIsProcessing(false); } };
  const handleExportSelected = async () => {
    if (!selectedCount) return; setIsProcessing(true);
    try { downloadPdf(await mergePdfPages(pages.filter((p) => selectedIds.has(p.id)), buildExportOpts()), 'selected_pages.pdf'); }
    catch (e) { alert(`Export failed: ${e instanceof Error ? e.message : 'Unknown'}`); } finally { setIsProcessing(false); }
  };

  const buildExportOpts = (): ExportOptions => {
    const opts: ExportOptions = { annotations, formValues, compression };
    if (pageNumSettings.enabled) opts.pageNumberSettings = pageNumSettings;
    if (watermarkSettings.enabled) opts.watermarkSettings = watermarkSettings;
    if (headerFooter.enabled) opts.headerFooterSettings = headerFooter;
    if (bookmarks.length) opts.bookmarks = bookmarks;
    return opts;
  };

  const handleExport = async () => {
    if (!pages.length) return; setIsProcessing(true);
    try { downloadPdf(await mergePdfPages(pages, buildExportOpts()), 'combined.pdf'); }
    catch (e) { alert(`Export failed: ${e instanceof Error ? e.message : 'Unknown'}`); } finally { setIsProcessing(false); }
  };

  const handleExportAsImages = () => { if (pages.length) downloadAllPagesAsImages(pages, 'png'); };

  // ─── Drag ───────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true); };
  const onDragLeave = () => setIsDraggingOver(false);
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); };
  const handleItemDragStart = (e: React.DragEvent, i: number) => { setDraggedIndex(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 20, 20); };
  const handleItemDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (draggedIndex === null || draggedIndex === i) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDragOverIndex(i); setDragOverPosition(e.clientY < r.top + r.height / 2 ? 'top' : 'bottom'); };
  const handleItemDragEnd = () => { if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) { setPages((p) => { const n = [...p]; const [d] = n.splice(draggedIndex, 1); n.splice(dragOverPosition === 'bottom' ? (draggedIndex < dragOverIndex ? dragOverIndex : dragOverIndex + 1) : (draggedIndex < dragOverIndex ? dragOverIndex - 1 : dragOverIndex), 0, d); return n; }); } setDraggedIndex(null); setDragOverIndex(null); setDragOverPosition(null); };
  const scrollToPage = (id: string) => document.getElementById(`preview-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pages={pages}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        selectedCount={selectedCount}
        annotations={annotations}
        draggedIndex={draggedIndex}
        dragOverIndex={dragOverIndex}
        dragOverPosition={dragOverPosition}
        onToggleSelectionMode={() => setSelectionMode(true)}
        onExitSelectionMode={exitSelectionMode}
        onClearAll={clearAll}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onRotateSelected={rotateSelected}
        onDuplicateSelected={duplicateSelected}
        onMoveSelectedToTop={moveSelectedToTop}
        onMoveSelectedToBottom={moveSelectedToBottom}
        onExportSelected={handleExportSelected}
        onRemoveSelected={removeSelected}
        onToggleSelection={toggleSelection}
        onScrollToPage={scrollToPage}
        onItemDragStart={handleItemDragStart}
        onItemDragOver={handleItemDragOver}
        onItemDragEnd={handleItemDragEnd}
        onRotatePage={rotatePage}
        onDuplicatePage={duplicatePage}
        onDownloadPage={handleDownloadPage}
        onRemovePage={removePage}
        onAddFiles={() => fileInputRef.current?.click()}
      />

      <div className="main-area">
        <Header
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          pageCount={pages.length}
          zoom={zoom}
          zoomMin={ZOOM_MIN}
          zoomMax={ZOOM_MAX}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
          saveStatus={saveStatus}
          compression={compression}
          onCompressionChange={setCompression}
          isProcessing={isProcessing}
          onExport={handleExport}
          onExportAsImages={handleExportAsImages}
          pageNumSettings={pageNumSettings}
          watermarkSettings={watermarkSettings}
          headerFooter={headerFooter}
          bookmarks={bookmarks}
          onOpenModal={setActiveModal}
        />

        <MainContent
          pages={pages}
          isProcessing={isProcessing}
          isDraggingOver={isDraggingOver}
          zoom={zoom}
          editMode={editMode}
          editingPageId={editingPageId}
          signatureImage={signatureImage}
          annotations={annotations}
          formValues={formValues}
          fillingFormPageId={fillingFormPageId}
          selectedIds={selectedIds}
          selectionMode={selectionMode}
          pageNumSettings={pageNumSettings}
          watermarkSettings={watermarkSettings}
          headerFooter={headerFooter}
          recoveryInfo={recoveryInfo}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onDropZoneClick={() => fileInputRef.current?.click()}
          onFinishEditing={finishEditing}
          onAddAnnotation={addAnnotation}
          onRemoveAnnotation={removeAnnotation}
          onSetFormFieldValue={setFormFieldValue}
          onSetFillingFormPageId={setFillingFormPageId}
          onRotatePage={rotatePage}
          onDuplicatePage={duplicatePage}
          onDownloadPage={handleDownloadPage}
          onRemovePage={removePage}
          onStartSigning={startSigning}
          onStartRedacting={startRedacting}
          onStartTextAnnotation={startTextAnnotation}
          onStartHighlighting={startHighlighting}
          onToggleSelection={toggleSelection}
          onRestoreSession={restoreSession}
          onDiscardSession={discardSession}
        />

        <input type="file" ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} accept="application/pdf,image/png,image/jpeg,image/webp" multiple style={{ display: 'none' }} />
      </div>

      {/* Modals */}
      <Modal open={activeModal === 'signature'} onClose={() => { setActiveModal(null); setSigTargetPageId(null); }} title="Create Signature" width="640px">
        <SignaturePad onSave={handleSignatureSave} onCancel={() => { setActiveModal(null); setSigTargetPageId(null); }} />
      </Modal>
      <Modal open={activeModal === 'pageNumbers'} onClose={() => setActiveModal(null)} title="Page Numbers" width="480px">
        <PageNumberConfig settings={pageNumSettings} onChange={setPageNumSettings} />
      </Modal>
      <Modal open={activeModal === 'watermark'} onClose={() => setActiveModal(null)} title="Watermark" width="480px">
        <WatermarkConfig settings={watermarkSettings} onChange={setWatermarkSettings} />
      </Modal>
      <Modal open={activeModal === 'bookmarks'} onClose={() => setActiveModal(null)} title="Bookmarks / Table of Contents" width="560px">
        <BookmarkEditor bookmarks={bookmarks} pageCount={pages.length} onChange={setBookmarks} />
      </Modal>
      <Modal open={activeModal === 'headerFooter'} onClose={() => setActiveModal(null)} title="Headers & Footers" width="540px">
        <HeaderFooterConfig settings={headerFooter} onChange={setHeaderFooter} />
      </Modal>
      <Modal open={activeModal === 'about'} onClose={() => setActiveModal(null)} title="About PDF Page Master" width="480px">
        <AboutModal onDonate={() => window.open('https://github.com/sponsors', '_blank')} />
      </Modal>
    </div>
  );
}
