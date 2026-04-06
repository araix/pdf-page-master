import React, { useState } from 'react';
import {
  FileText, Download, PanelLeftClose, ZoomIn, ZoomOut, Loader2,
  Hash, Droplets, AlignLeft, BookmarkPlus, Image, Info, MoreVertical, Menu
} from 'lucide-react';
import type { PageNumberSettings, WatermarkSettings, HeaderFooterSettings, Bookmark } from '../lib/types';

interface HeaderProps {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  pageCount: number;
  zoom: number;
  zoomMin: number;
  zoomMax: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  compression: 'none' | 'medium' | 'high';
  onCompressionChange: (value: 'none' | 'medium' | 'high') => void;
  isProcessing: boolean;
  onExport: () => void;
  onExportAsImages: () => void;
  pageNumSettings: PageNumberSettings;
  watermarkSettings: WatermarkSettings;
  headerFooter: HeaderFooterSettings;
  bookmarks: Bookmark[];
  onOpenModal: (modal: string) => void;
}

export default function Header({
  sidebarOpen, onOpenSidebar, pageCount, zoom, zoomMin, zoomMax,
  onZoomIn, onZoomOut, onZoomReset, saveStatus, compression, onCompressionChange,
  isProcessing, onExport, onExportAsImages,
  pageNumSettings, watermarkSettings, headerFooter, bookmarks, onOpenModal
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        {!sidebarOpen && (
          <button className="icon-btn" onClick={onOpenSidebar} title="Open Sidebar">
            <PanelLeftClose size={20} />
          </button>
        )}
        <div className="header-brand">
          <div className="header-brand-icon"><FileText size={18} /></div>
          <h1>PDF Page Master</h1>
        </div>
        <button className="icon-btn about-btn header-about-desktop" onClick={() => onOpenModal('about')} title="About">
          <Info size={18} />
        </button>
      </div>

      <div className="header-right">
        {/* Mobile menu toggle */}
        {pageCount > 0 && (
          <button 
            className="icon-btn header-mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Desktop tools - hidden on mobile */}
        {pageCount > 0 && (
          <div className="header-tools header-desktop-only">
            <button 
              className={`tool-btn ${pageNumSettings.enabled ? 'active' : ''}`} 
              onClick={() => onOpenModal('pageNumbers')} 
              title="Page Numbers"
            >
              <Hash size={15} />
            </button>
            <button 
              className={`tool-btn ${watermarkSettings.enabled ? 'active' : ''}`} 
              onClick={() => onOpenModal('watermark')} 
              title="Watermark"
            >
              <Droplets size={15} />
            </button>
            <button 
              className={`tool-btn ${headerFooter.enabled ? 'active' : ''}`} 
              onClick={() => onOpenModal('headerFooter')} 
              title="Headers & Footers"
            >
              <AlignLeft size={15} />
            </button>
            <button 
              className={`tool-btn ${bookmarks.length > 0 ? 'active' : ''}`} 
              onClick={() => onOpenModal('bookmarks')} 
              title="Bookmarks / TOC"
            >
              <BookmarkPlus size={15} />
            </button>
          </div>
        )}

        {/* Zoom controls - hidden on small mobile */}
        {pageCount > 0 && (
          <div className="zoom-controls header-tablet-up">
            <button className="icon-btn" onClick={onZoomOut} disabled={zoom <= zoomMin} title="Zoom Out">
              <ZoomOut size={18} />
            </button>
            <button className="zoom-label" onClick={onZoomReset} title="Reset">
              {zoom}%
            </button>
            <button className="icon-btn" onClick={onZoomIn} disabled={zoom >= zoomMax} title="Zoom In">
              <ZoomIn size={18} />
            </button>
          </div>
        )}

        {/* Page count - hidden on small mobile */}
        <span className="page-count header-tablet-up">{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
        
        {/* Save status - hidden on mobile */}
        {saveStatus === 'saving' && <span className="save-indicator saving header-desktop-only">Saving…</span>}
        {saveStatus === 'saved' && <span className="save-indicator saved header-desktop-only">✓ Saved</span>}

        {/* Export controls */}
        {pageCount > 0 && (
          <div className="export-group">
            <select 
              className="compress-select header-tablet-up" 
              value={compression} 
              onChange={(e) => onCompressionChange(e.target.value as any)} 
              title="Compression"
            >
              <option value="none">No Compress</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button className="btn btn-primary header-export-btn" onClick={onExport} disabled={isProcessing}>
              {isProcessing ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              <span className="header-tablet-up"> Export PDF</span>
            </button>
            <button className="btn btn-secondary export-img-btn header-desktop-only" onClick={onExportAsImages} title="Export as Images">
              <Image size={15} />
            </button>
          </div>
        )}
        {!pageCount && (
          <button className="btn btn-primary" disabled>
            <Download size={16} /><span className="header-tablet-up"> Export PDF</span>
          </button>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && pageCount > 0 && (
        <>
          <div className="header-mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <div className="header-mobile-menu">
            <div className="header-mobile-menu-section">
              <div className="header-mobile-menu-title">Tools</div>
              <button 
                className={`header-mobile-menu-item ${pageNumSettings.enabled ? 'active' : ''}`}
                onClick={() => { onOpenModal('pageNumbers'); setMobileMenuOpen(false); }}
              >
                <Hash size={18} />
                <span>Page Numbers</span>
              </button>
              <button 
                className={`header-mobile-menu-item ${watermarkSettings.enabled ? 'active' : ''}`}
                onClick={() => { onOpenModal('watermark'); setMobileMenuOpen(false); }}
              >
                <Droplets size={18} />
                <span>Watermark</span>
              </button>
              <button 
                className={`header-mobile-menu-item ${headerFooter.enabled ? 'active' : ''}`}
                onClick={() => { onOpenModal('headerFooter'); setMobileMenuOpen(false); }}
              >
                <AlignLeft size={18} />
                <span>Headers & Footers</span>
              </button>
              <button 
                className={`header-mobile-menu-item ${bookmarks.length > 0 ? 'active' : ''}`}
                onClick={() => { onOpenModal('bookmarks'); setMobileMenuOpen(false); }}
              >
                <BookmarkPlus size={18} />
                <span>Bookmarks / TOC</span>
              </button>
            </div>

            <div className="header-mobile-menu-section">
              <div className="header-mobile-menu-title">Zoom</div>
              <div className="header-mobile-zoom">
                <button className="icon-btn" onClick={onZoomOut} disabled={zoom <= zoomMin}>
                  <ZoomOut size={18} />
                </button>
                <span className="zoom-value">{zoom}%</span>
                <button className="icon-btn" onClick={onZoomIn} disabled={zoom >= zoomMax}>
                  <ZoomIn size={18} />
                </button>
                <button className="btn btn-secondary" onClick={onZoomReset} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: '13px' }}>
                  Reset
                </button>
              </div>
            </div>

            <div className="header-mobile-menu-section">
              <div className="header-mobile-menu-title">Export</div>
              <button 
                className="header-mobile-menu-item"
                onClick={() => { onExportAsImages(); setMobileMenuOpen(false); }}
              >
                <Image size={18} />
                <span>Export as Images</span>
              </button>
              <div className="header-mobile-compression">
                <label htmlFor="mobile-compression">Compression:</label>
                <select 
                  id="mobile-compression"
                  value={compression} 
                  onChange={(e) => onCompressionChange(e.target.value as any)}
                >
                  <option value="none">None</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="header-mobile-menu-section">
              <button 
                className="header-mobile-menu-item"
                onClick={() => { onOpenModal('about'); setMobileMenuOpen(false); }}
              >
                <Info size={18} />
                <span>About</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
