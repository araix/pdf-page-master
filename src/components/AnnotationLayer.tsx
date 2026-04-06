import React, { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import type { Annotation } from '../lib/types';

interface Props {
  annotations: Annotation[];
  editMode: 'signature' | 'redaction' | 'text' | 'highlight' | null;
  signatureImage: string | null;
  onAdd: (ann: Annotation) => void;
  onRemove: (id: string) => void;
}

export default function AnnotationLayer({ annotations, editMode, signatureImage, onAdd, onRemove }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);

  const getRelPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const el = layerRef.current!;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editMode === 'redaction' || editMode === 'highlight') {
      e.preventDefault();
      setDrawStart(getRelPos(e));
      setDrawCurrent(getRelPos(e));
    } else if (editMode === 'signature' && signatureImage) {
      e.preventDefault();
      const pos = getRelPos(e);
      const sigW = 0.25, sigH = 0.06;
      onAdd({
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'signature',
        x: Math.max(0, Math.min(1 - sigW, pos.x - sigW / 2)),
        y: Math.max(0, Math.min(1 - sigH, pos.y - sigH / 2)),
        width: sigW, height: sigH, imageData: signatureImage,
      });
    } else if (editMode === 'text') {
      e.preventDefault();
      const pos = getRelPos(e);
      setTextInput({ x: pos.x, y: pos.y, value: '' });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if ((editMode === 'redaction' || editMode === 'highlight') && drawStart) {
      setDrawCurrent(getRelPos(e));
    }
  };

  const handleMouseUp = () => {
    if ((editMode === 'redaction' || editMode === 'highlight') && drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      if (w > 0.01 && h > 0.005) {
        onAdd({
          id: `${editMode === 'highlight' ? 'hl' : 'red'}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: editMode,
          x, y, width: w, height: h,
        });
      }
    }
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const commitText = () => {
    if (textInput && textInput.value.trim()) {
      onAdd({
        id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'text',
        x: textInput.x, y: textInput.y,
        width: 0.3, height: 0.03,
        text: textInput.value.trim(),
        fontSize: 14, color: '#1a1a2e',
      });
    }
    setTextInput(null);
  };

  const isInteractive = editMode !== null;
  const drawType = editMode === 'highlight' ? 'highlight' : 'redaction';

  return (
    <div
      ref={layerRef}
      className={`annotation-layer ${isInteractive ? 'interactive' : ''} ${editMode === 'redaction' || editMode === 'highlight' ? 'crosshair' : ''} ${editMode === 'signature' ? 'sig-cursor' : ''} ${editMode === 'text' ? 'text-cursor' : ''}`}
      onMouseDown={isInteractive ? handleMouseDown : undefined}
      onMouseMove={isInteractive ? handleMouseMove : undefined}
      onMouseUp={isInteractive ? handleMouseUp : undefined}
    >
      {annotations.map((ann) => (
        <div
          key={ann.id}
          className={`annotation-item ${ann.type}`}
          style={{
            left: `${ann.x * 100}%`, top: `${ann.y * 100}%`,
            width: `${ann.width * 100}%`, height: `${ann.height * 100}%`,
            ...(ann.type === 'text' ? { fontSize: `${ann.fontSize || 14}px`, color: ann.color || '#1a1a2e' } : {}),
          }}
          onMouseEnter={() => setHovered(ann.id)}
          onMouseLeave={() => setHovered(null)}
        >
          {ann.type === 'signature' && ann.imageData && (
            <img src={ann.imageData} alt="Signature" className="annotation-sig-img" />
          )}
          {ann.type === 'text' && (
            <span className="annotation-text-content">{ann.text}</span>
          )}
          {hovered === ann.id && !isInteractive && (
            <button className="annotation-delete" onClick={(e) => { e.stopPropagation(); onRemove(ann.id); }}>
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      {/* Active drawing */}
      {drawStart && drawCurrent && (
        <div
          className={`annotation-item ${drawType} drawing`}
          style={{
            left: `${Math.min(drawStart.x, drawCurrent.x) * 100}%`,
            top: `${Math.min(drawStart.y, drawCurrent.y) * 100}%`,
            width: `${Math.abs(drawCurrent.x - drawStart.x) * 100}%`,
            height: `${Math.abs(drawCurrent.y - drawStart.y) * 100}%`,
          }}
        />
      )}

      {/* Text input */}
      {textInput && (
        <div className="annotation-text-input-wrap" style={{ left: `${textInput.x * 100}%`, top: `${textInput.y * 100}%` }}>
          <input
            autoFocus
            type="text"
            className="annotation-text-input"
            placeholder="Type text…"
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && commitText()}
            onBlur={commitText}
          />
        </div>
      )}
    </div>
  );
}
