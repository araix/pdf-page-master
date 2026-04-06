import React from 'react';
import {
  FileUp, Download, Loader2, RotateCcw, RotateCw, Copy,
  PenTool, EyeOff, Type, Highlighter, FileInput, Trash2, CheckSquare, Square
} from 'lucide-react';
import type { PageInfo, Annotation, PageNumberSettings, WatermarkSettings, HeaderFooterSettings } from '../lib/types';
import { formatPageNumber, substituteVars } from '../lib/types';
import AnnotationLayer from './AnnotationLayer';

interface MainContentProps {
  pages: PageInfo[];
  isProcessing: boolean;
  isDraggingOver: boolean;
  zoom: number;
  editMode: 'signature' | 'redaction' | 'text' | 'highlight' | null;
  editingPageId: string | null;
  signatureImage: string | null;
  annotations: Record<string, Annotation[]>;
  formValues: Record<string, Record<string, string>>;
  fillingFormPageId: string | null;
  selectedIds: Set<string>;
  selectionMode: boolean;
  pageNumSettings: PageNumberSettings;
  watermarkSettings: WatermarkSettings;
  headerFooter: HeaderFooterSettings;
  recoveryInfo: { savedAt: number; pageCount: number } | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDropZoneClick: () => void;
  onFinishEditing: () => void;
  onAddAnnotation: (pageId: string, ann: Annotation) => void;
  onRemoveAnnotation: (pageId: string, annId: string) => void;
  onSetFormFieldValue: (pageId: string, fieldName: string, value: string) => void;
  onSetFillingFormPageId: (pageId: string | null) => void;
  onRotatePage: (id: string, dir: 'cw' | 'ccw') => void;
  onDuplicatePage: (id: string) => void;
  onDownloadPage: (page: PageInfo) => void;
  onRemovePage: (id: string) => void;
  onStartSigning: (pageId: string) => void;
  onStartRedacting: (pageId: string) => void;
  onStartTextAnnotation: (pageId: string) => void;
  onStartHighlighting: (pageId: string) => void;
  onToggleSelection: (id: string, index: number, shiftKey: boolean) => void;
  onRestoreSession: () => void;
  onDiscardSession: () => void;
}

export default function MainContent({
  pages, isProcessing, isDraggingOver, zoom, editMode, editingPageId, signatureImage,
  annotations, formValues, fillingFormPageId, selectedIds, selectionMode,
  pageNumSettings, watermarkSettings, headerFooter, recoveryInfo,
  onDragOver, onDragLeave, onDrop, onDropZoneClick, onFinishEditing,
  onAddAnnotation, onRemoveAnnotation, onSetFormFieldValue, onSetFillingFormPageId,
  onRotatePage, onDuplicatePage, onDownloadPage, onRemovePage,
  onStartSigning, onStartRedacting, onStartTextAnnotation, onStartHighlighting,
  onToggleSelection, onRestoreSession, onDiscardSession
}: MainContentProps) {
  return (
    <>
      {editMode && (
        <div className="edit-mode-bar">
          <span className="edit-mode-label">
            {editMode === 'signature' && '✒️ Click on the page to place your signature'}
            {editMode === 'redaction' && '⬛ Click & drag to draw redaction rectangles'}
            {editMode === 'text' && '📝 Click on the page to add text'}
            {editMode === 'highlight' && '🟡 Click & drag to highlight'}
          </span>
          <button className="btn btn-primary" onClick={onFinishEditing} style={{ padding: '6px 16px' }}>
            Done
          </button>
        </div>
      )}

      <main className="content-area" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {recoveryInfo && !pages.length && (
          <div className="recovery-banner">
            <div className="recovery-icon">📋</div>
            <div className="recovery-info">
              <strong>Previous session found</strong>
              <span>{recoveryInfo.pageCount} {recoveryInfo.pageCount === 1 ? 'page' : 'pages'} — saved {new Date(recoveryInfo.savedAt).toLocaleString()}</span>
            </div>
            <div className="recovery-actions">
              <button className="btn btn-primary" onClick={onRestoreSession} style={{ padding: '8px 20px' }}>
                Restore Session
              </button>
              <button className="btn btn-secondary" onClick={onDiscardSession} style={{ padding: '8px 16px' }}>
                Discard
              </button>
            </div>
          </div>
        )}

        {!pages.length ? (
          <div className={`drop-zone ${isDraggingOver ? 'active' : ''}`} onClick={onDropZoneClick}>
            <div className="drop-zone-icon"><FileUp size={36} /></div>
            <h3>Start by adding a PDF or Image</h3>
            <p>Drag and drop PDF files or images here, or click to browse.</p>
          </div>
        ) : (
          <div className="pages-grid" style={{ maxWidth: `${zoom * 9}px` }}>
            {pages.map((page, index) => {
              const isEditing = editingPageId === page.id;
              const pageAnns = annotations[page.id] || [];
              const pageFormVals = formValues[page.id] || {};
              const isFilling = fillingFormPageId === page.id;
              const totalPages = pages.length;
              return (
                <div 
                  key={page.id} 
                  id={`preview-${page.id}`} 
                  className={`page-preview${selectedIds.has(page.id) ? ' selected' : ''}${isEditing ? ' editing' : ''}`}
                >
                  <div className="page-preview-number">{index + 1}</div>
                  <div className="page-preview-card" style={{ position: 'relative' }}>
                    <img 
                      src={page.fullPreview} 
                      alt={`Page ${index + 1}`} 
                      loading="lazy" 
                      style={{ transform: page.rotation ? `rotate(${page.rotation}deg)` : undefined }} 
                    />

                    {/* Watermark preview */}
                    {watermarkSettings.enabled && watermarkSettings.text && (
                      <div className="watermark-live-overlay">
                        <span style={{ 
                          fontSize: `clamp(12px, ${watermarkSettings.fontSize * 0.55}px, 80px)`, 
                          opacity: Math.min(watermarkSettings.opacity * 2.5, 0.6), 
                          transform: `translate(-50%, -50%) rotate(${watermarkSettings.angle}deg)`, 
                          color: watermarkSettings.color 
                        }}>
                          {watermarkSettings.text}
                        </span>
                      </div>
                    )}

                    {/* Page number preview */}
                    {pageNumSettings.enabled && !(pageNumSettings.skipFirstPage && index === 0) && (
                      <div className={`page-num-live-overlay pos-${pageNumSettings.position}`}>
                        <span style={{ fontSize: `${Math.max(10, pageNumSettings.fontSize * 1.1)}px` }}>
                          {formatPageNumber(index + pageNumSettings.startNumber, pageNumSettings.format)}
                        </span>
                      </div>
                    )}

                    {/* Header/Footer preview */}
                    {headerFooter.enabled && !(headerFooter.skipFirstPage && index === 0) && (() => {
                      const vars: Record<string, string> = { 
                        page: String(index + 1), 
                        total: String(totalPages), 
                        date: new Date().toLocaleDateString(), 
                        filename: page.fileName 
                      };
                      return (
                        <>
                          {(headerFooter.headerLeft || headerFooter.headerCenter || headerFooter.headerRight) && (
                            <div className="hf-live-overlay hf-top">
                              <span className="hf-l">{substituteVars(headerFooter.headerLeft, vars)}</span>
                              <span className="hf-c">{substituteVars(headerFooter.headerCenter, vars)}</span>
                              <span className="hf-r">{substituteVars(headerFooter.headerRight, vars)}</span>
                            </div>
                          )}
                          {(headerFooter.footerLeft || headerFooter.footerCenter || headerFooter.footerRight) && (
                            <div className="hf-live-overlay hf-bottom">
                              <span className="hf-l">{substituteVars(headerFooter.footerLeft, vars)}</span>
                              <span className="hf-c">{substituteVars(headerFooter.footerCenter, vars)}</span>
                              <span className="hf-r">{substituteVars(headerFooter.footerRight, vars)}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Annotation layer */}
                    {(pageAnns.length > 0 || isEditing) && (
                      <AnnotationLayer 
                        annotations={pageAnns} 
                        editMode={isEditing ? editMode : null}
                        signatureImage={isEditing && editMode === 'signature' ? signatureImage : null}
                        onAdd={(ann) => onAddAnnotation(page.id, ann)} 
                        onRemove={(id) => onRemoveAnnotation(page.id, id)} 
                      />
                    )}

                    {/* Form overlay */}
                    {isFilling && page.formFields.length > 0 && (
                      <div className="form-overlay">
                        {page.formFields.map((field) => (
                          <div 
                            key={field.id} 
                            className="form-field-input" 
                            style={{ 
                              left: `${field.x * 100}%`, 
                              top: `${field.y * 100}%`, 
                              width: `${field.width * 100}%`, 
                              height: `${field.height * 100}%` 
                            }}
                          >
                            {field.fieldType === 'text' && (
                              <input 
                                type="text" 
                                value={pageFormVals[field.fieldName] ?? field.defaultValue} 
                                onChange={(e) => onSetFormFieldValue(page.id, field.fieldName, e.target.value)} 
                                placeholder={field.label} 
                                title={field.label} 
                              />
                            )}
                            {field.fieldType === 'checkbox' && (
                              <input 
                                type="checkbox" 
                                checked={(pageFormVals[field.fieldName] ?? field.defaultValue) === 'true'} 
                                onChange={(e) => onSetFormFieldValue(page.id, field.fieldName, String(e.target.checked))} 
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hover actions */}
                    {!isEditing && !isFilling && (
                      <div className="page-preview-actions">
                        <button className="preview-action-btn" onClick={() => onRotatePage(page.id, 'ccw')} title="Rotate CCW">
                          <RotateCcw size={16} />
                        </button>
                        <button className="preview-action-btn" onClick={() => onRotatePage(page.id, 'cw')} title="Rotate CW">
                          <RotateCw size={16} />
                        </button>
                        <button className="preview-action-btn" onClick={() => onDuplicatePage(page.id)} title="Duplicate">
                          <Copy size={16} />
                        </button>
                        <button className="preview-action-btn" onClick={() => onDownloadPage(page)} title="Download">
                          <Download size={16} />
                        </button>
                        <div className="preview-actions-divider" />
                        <button className="preview-action-btn accent" onClick={() => onStartSigning(page.id)} title="Sign">
                          <PenTool size={16} />
                        </button>
                        <button className="preview-action-btn accent" onClick={() => onStartRedacting(page.id)} title="Redact">
                          <EyeOff size={16} />
                        </button>
                        <button className="preview-action-btn accent" onClick={() => onStartTextAnnotation(page.id)} title="Add Text">
                          <Type size={16} />
                        </button>
                        <button className="preview-action-btn accent" onClick={() => onStartHighlighting(page.id)} title="Highlight">
                          <Highlighter size={16} />
                        </button>
                        {page.formFields.length > 0 && (
                          <button className="preview-action-btn accent" onClick={() => onSetFillingFormPageId(isFilling ? null : page.id)} title="Fill Form">
                            <FileInput size={16} />
                          </button>
                        )}
                        <div className="preview-actions-divider" />
                        <button className="preview-action-btn danger" onClick={() => onRemovePage(page.id)} title="Remove">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}

                    {isFilling && (
                      <div className="form-fill-bar">
                        <span>Filling form…</span>
                        <button className="btn btn-primary" onClick={() => onSetFillingFormPageId(null)} style={{ padding: '5px 14px', fontSize: '12px' }}>
                          Done
                        </button>
                      </div>
                    )}
                  </div>

                  {selectionMode && (
                    <div className="page-preview-select-overlay" onClick={() => onToggleSelection(page.id, index, false)}>
                      {selectedIds.has(page.id) ? (
                        <CheckSquare size={24} className="check-icon checked" />
                      ) : (
                        <Square size={24} className="check-icon" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-card">
            <Loader2 size={24} className="spin" />
            <span>Processing…</span>
          </div>
        </div>
      )}
    </>
  );
}
