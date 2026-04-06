import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { Bookmark } from '../lib/types';

interface Props {
  bookmarks: Bookmark[];
  pageCount: number;
  onChange: (b: Bookmark[]) => void;
}

export default function BookmarkEditor({ bookmarks, pageCount, onChange }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [newPage, setNewPage] = useState(1);

  const add = () => {
    if (!newTitle.trim()) return;
    onChange([...bookmarks, {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      pageIndex: Math.min(newPage - 1, pageCount - 1),
    }]);
    setNewTitle('');
  };

  const remove = (id: string) => onChange(bookmarks.filter((b) => b.id !== id));

  const updateTitle = (id: string, title: string) =>
    onChange(bookmarks.map((b) => b.id === id ? { ...b, title } : b));

  return (
    <div className="config-form">
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
        Add bookmarks to create a navigable table of contents in your exported PDF. Readers can jump to any bookmarked page.
      </p>

      {bookmarks.length > 0 && (
        <div className="bookmark-list">
          {bookmarks.map((bm) => (
            <div key={bm.id} className="bookmark-item">
              <GripVertical size={14} className="grip" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <input
                type="text"
                className="config-input bookmark-title-input"
                value={bm.title}
                onChange={(e) => updateTitle(bm.id, e.target.value)}
              />
              <span className="bookmark-page-badge">p.{bm.pageIndex + 1}</span>
              <button className="icon-btn danger" onClick={() => remove(bm.id)} style={{ width: 24, height: 24 }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {bookmarks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          No bookmarks yet. Add one below.
        </div>
      )}

      <div className="bookmark-add-row">
        <input
          type="text"
          className="config-input"
          placeholder="Bookmark title (e.g. Chapter 1)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ flex: 1 }}
        />
        <select
          className="config-input"
          value={newPage}
          onChange={(e) => setNewPage(parseInt(e.target.value))}
          style={{ width: '80px' }}
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <option key={i} value={i + 1}>p.{i + 1}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={add} style={{ padding: '8px 12px' }}>
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}
