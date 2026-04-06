import React from 'react';
import {
  FileText, Trash2, ChevronLeft, LayoutGrid, CheckSquare, Square,
  GripVertical, RotateCw, Copy, Download, ArrowUpToLine, ArrowDownToLine, Scissors, Plus
} from 'lucide-react';
import type { PageInfo, Annotation } from '../lib/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageInfo[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  selectedCount: number;
  annotations: Record<string, Annotation[]>;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  dragOverPosition: 'top' | 'bottom' | null;
  onToggleSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onClearAll: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRotateSelected: (dir: 'cw' | 'ccw') => void;
  onDuplicateSelected: () => void;
  onMoveSelectedToTop: () => void;
  onMoveSelectedToBottom: () => void;
  onExportSelected: () => void;
  onRemoveSelected: () => void;
  onToggleSelection: (id: string, index: number, shiftKey: boolean) => void;
  onScrollToPage: (id: string) => void;
  onItemDragStart: (e: React.DragEvent, index: number) => void;
  onItemDragOver: (e: React.DragEvent, index: number) => void;
  onItemDragEnd: () => void;
  onRotatePage: (id: string, dir: 'cw' | 'ccw') => void;
  onDuplicatePage: (id: string) => void;
  onDownloadPage: (page: PageInfo) => void;
  onRemovePage: (id: string) => void;
  onAddFiles: () => void;
}

export default function Sidebar({
  isOpen, onClose, pages, selectionMode, selectedIds, selectedCount, annotations,
  draggedIndex, dragOverIndex, dragOverPosition,
  onToggleSelectionMode, onExitSelectionMode, onClearAll, onSelectAll, onDeselectAll,
  onRotateSelected, onDuplicateSelected, onMoveSelectedToTop, onMoveSelectedToBottom,
  onExportSelected, onRemoveSelected, onToggleSelection, onScrollToPage,
  onItemDragStart, onItemDragOver, onItemDragEnd,
  onRotatePage, onDuplicatePage, onDownloadPage, onRemovePage, onAddFiles
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header">
          <h2><LayoutGrid size={16} /> Pages</h2>
          <div className="sidebar-actions">
            {pages.length > 0 && (
              <button 
                className={`icon-btn ${selectionMode ? 'active' : ''}`} 
                onClick={selectionMode ? onExitSelectionMode : onToggleSelectionMode} 
                title={selectionMode ? 'Exit Selection' : 'Select Pages'}
              >
                <CheckSquare size={16} />
              </button>
            )}
            <button className="icon-btn danger" onClick={onClearAll} title="Clear All">
              <Trash2 size={16} />
            </button>
            <button className="icon-btn" onClick={onClose} title="Close Sidebar">
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {selectionMode && pages.length > 0 && (
          <div className="selection-toolbar">
            <div className="selection-toolbar-info">
              <span className="selection-count">{selectedCount} selected</span>
              <button className="selection-link" onClick={onSelectAll}>All</button>
              <button className="selection-link" onClick={onDeselectAll}>None</button>
            </div>
            <div className="selection-toolbar-actions">
              <button className="icon-btn" onClick={() => onRotateSelected('cw')} disabled={!selectedCount} title="Rotate CW">
                <RotateCw size={14} />
              </button>
              <button className="icon-btn" onClick={onDuplicateSelected} disabled={!selectedCount} title="Duplicate">
                <Copy size={14} />
              </button>
              <button className="icon-btn" onClick={onMoveSelectedToTop} disabled={!selectedCount} title="Move Top">
                <ArrowUpToLine size={14} />
              </button>
              <button className="icon-btn" onClick={onMoveSelectedToBottom} disabled={!selectedCount} title="Move Bottom">
                <ArrowDownToLine size={14} />
              </button>
              <button className="icon-btn" onClick={onExportSelected} disabled={!selectedCount} title="Export Selected">
                <Scissors size={14} />
              </button>
              <button className="icon-btn danger" onClick={onRemoveSelected} disabled={!selectedCount} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="sidebar-list">
          {!pages.length ? (
            <div className="sidebar-empty">
              <FileText size={36} />
              <p>No pages yet.<br />Upload a PDF or image.</p>
            </div>
          ) : pages.map((page, index) => (
            <div 
              key={page.id}
              className={`page-item${draggedIndex === index ? ' dragging' : ''}${dragOverIndex === index && dragOverPosition === 'top' ? ' drag-over-top' : ''}${dragOverIndex === index && dragOverPosition === 'bottom' ? ' drag-over-bottom' : ''}${selectedIds.has(page.id) ? ' selected' : ''}`}
              draggable={!selectionMode}
              onDragStart={(e) => onItemDragStart(e, index)} 
              onDragOver={(e) => onItemDragOver(e, index)} 
              onDragEnd={onItemDragEnd}
              onClick={(e) => selectionMode ? (e.preventDefault(), onToggleSelection(page.id, index, e.shiftKey)) : onScrollToPage(page.id)}
            >
              {selectionMode ? (
                <div className="page-item-checkbox">
                  {selectedIds.has(page.id) ? (
                    <CheckSquare size={16} className="check-icon checked" />
                  ) : (
                    <Square size={16} className="check-icon" />
                  )}
                </div>
              ) : (
                <div className="page-item-index">
                  <GripVertical size={14} className="grip" />
                  <span className="num">{index + 1}</span>
                </div>
              )}
              <div className="page-item-thumb">
                <img 
                  src={page.thumbnail} 
                  alt="" 
                  loading="lazy" 
                  style={{ transform: page.rotation ? `rotate(${page.rotation}deg)` : undefined }} 
                />
              </div>
              <div className="page-item-info">
                <div className="file-label" title={page.fileName}>{page.fileName}</div>
                <div className="page-label">
                  Page {page.pageIndex + 1}
                  {page.rotation !== 0 && <span className="rotation-badge">{page.rotation}°</span>}
                  {page.formFields.length > 0 && <span className="form-badge">Form</span>}
                  {(annotations[page.id]?.length || 0) > 0 && <span className="ann-badge">{annotations[page.id].length}</span>}
                </div>
              </div>
              {!selectionMode && (
                <div className="page-item-actions">
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onRotatePage(page.id, 'cw'); }} title="Rotate CW">
                    <RotateCw size={13} />
                  </button>
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onDuplicatePage(page.id); }} title="Duplicate">
                    <Copy size={13} />
                  </button>
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onDownloadPage(page); }} title="Download">
                    <Download size={13} />
                  </button>
                  <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); onRemovePage(page.id); }} title="Remove">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-full" onClick={onAddFiles}>
            <Plus size={16} /> Add PDF / Image
          </button>
        </div>
      </aside>
    </>
  );
}
