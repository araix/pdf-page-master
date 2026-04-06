import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Move, Maximize2 } from 'lucide-react';
import type { Annotation } from '../lib/types';

interface Props {
  annotations: Annotation[];
  editMode: 'signature' | 'redaction' | 'text' | 'highlight' | null;
  signatureImage: string | null;
  textSettings: { text: string; fontFamily: string; fontSize: number; color: string } | null;
  onAdd: (ann: Annotation) => void;
  onRemove: (id: string) => void;
  onUpdate?: (ann: Annotation) => void;
}

type DragAction =
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; handle: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number };

export default function AnnotationLayer({ annotations, editMode, signatureImage, textSettings, onAdd, onRemove, onUpdate }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragAction, setDragAction] = useState<DragAction | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const getRelPos = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const el = layerRef.current!;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  // ── Move / Resize handlers (work even outside edit mode) ──
  const handleMoveStart = (e: React.MouseEvent, ann: Annotation) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getRelPos(e);
    setDragAction({ kind: 'move', id: ann.id, startX: pos.x, startY: pos.y, origX: ann.x, origY: ann.y });
    setActiveId(ann.id);
  };

  const handleResizeStart = (e: React.MouseEvent, ann: Annotation, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getRelPos(e);
    setDragAction({
      kind: 'resize', id: ann.id, handle, startX: pos.x, startY: pos.y,
      origX: ann.x, origY: ann.y, origW: ann.width, origH: ann.height,
    });
    setActiveId(ann.id);
  };

  useEffect(() => {
    if (!dragAction) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!layerRef.current) return;
      const pos = getRelPos(e);
      const ann = annotations.find((a) => a.id === dragAction.id);
      if (!ann || !onUpdate) return;

      if (dragAction.kind === 'move') {
        const dx = pos.x - dragAction.startX;
        const dy = pos.y - dragAction.startY;
        const newX = Math.max(0, Math.min(1 - ann.width, dragAction.origX + dx));
        const newY = Math.max(0, Math.min(1 - ann.height, dragAction.origY + dy));
        onUpdate({ ...ann, x: newX, y: newY });
      } else if (dragAction.kind === 'resize') {
        const dx = pos.x - dragAction.startX;
        const dy = pos.y - dragAction.startY;
        const { handle, origX, origY, origW, origH } = dragAction;
        let newX = origX, newY = origY, newW = origW, newH = origH;
        const MIN_W = 0.04, MIN_H = 0.02;

        if (handle.includes('e')) { newW = Math.max(MIN_W, Math.min(1 - origX, origW + dx)); }
        if (handle.includes('w')) { newW = Math.max(MIN_W, origW - dx); newX = Math.max(0, origX + origW - newW); }
        if (handle.includes('s')) { newH = Math.max(MIN_H, Math.min(1 - origY, origH + dy)); }
        if (handle.includes('n')) { newH = Math.max(MIN_H, origH - dy); newY = Math.max(0, origY + origH - newH); }

        onUpdate({ ...ann, x: newX, y: newY, width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setDragAction(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragAction, annotations, getRelPos, onUpdate]);

  // Deselect active annotation on click outside
  useEffect(() => {
    if (!activeId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (layerRef.current && !layerRef.current.contains(e.target as Node)) {
        setActiveId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeId]);

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
    } else if (editMode === 'text' && textSettings) {
      e.preventDefault();
      const pos = getRelPos(e);
      // Calculate text dimensions based on font size
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.font = `${textSettings.fontSize}px "${textSettings.fontFamily}"`;
      const metrics = ctx.measureText(textSettings.text);
      const textWidth = metrics.width;
      const textHeight = textSettings.fontSize * 1.2; // Approximate line height

      // Convert to relative coordinates
      const relWidth = Math.min(0.8, textWidth / layerRef.current!.clientWidth);
      const relHeight = Math.min(0.2, textHeight / layerRef.current!.clientHeight);

      onAdd({
        id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'text',
        x: Math.max(0, Math.min(1 - relWidth, pos.x - relWidth / 2)),
        y: Math.max(0, Math.min(1 - relHeight, pos.y - relHeight / 2)),
        width: relWidth,
        height: relHeight,
        text: textSettings.text,
        fontSize: textSettings.fontSize,
        color: textSettings.color,
        fontFamily: textSettings.fontFamily,
      });
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



  const isInteractive = editMode !== null;
  const drawType = editMode === 'highlight' ? 'highlight' : 'redaction';

  return (
    <div
      ref={layerRef}
      className={`annotation-layer ${isInteractive ? 'interactive' : ''} ${editMode === 'redaction' || editMode === 'highlight' ? 'crosshair' : ''} ${editMode === 'signature' ? 'sig-cursor' : ''} ${editMode === 'text' ? 'text-cursor' : ''} ${dragAction ? 'dragging-ann' : ''}`}
      onMouseDown={isInteractive ? handleMouseDown : undefined}
      onMouseMove={isInteractive ? handleMouseMove : undefined}
      onMouseUp={isInteractive ? handleMouseUp : undefined}
    >
      {annotations.map((ann) => {
        const isActive = activeId === ann.id;
        const isMovable = (ann.type === 'signature' || ann.type === 'text') && onUpdate;
        const isDragging = dragAction?.id === ann.id;

        return (
          <div
            key={ann.id}
            className={`annotation-item ${ann.type}${isActive ? ' ann-active' : ''}${isDragging ? ' ann-dragging' : ''}`}
            style={{
              left: `${ann.x * 100}%`, top: `${ann.y * 100}%`,
              width: `${ann.width * 100}%`, height: `${ann.height * 100}%`,
              ...(ann.type === 'text' ? {
                fontFamily: ann.fontFamily || 'Arial',
                fontSize: `${ann.fontSize || 14}px`,
                color: ann.color || '#1a1a2e'
              } : {}),
            }}
            onMouseEnter={() => setHovered(ann.id)}
            onMouseLeave={() => setHovered(null)}
            onMouseDown={(e) => {
              if (isMovable && !isInteractive) {
                e.stopPropagation();
                setActiveId(ann.id);
              }
            }}
          >
            {ann.type === 'signature' && ann.imageData && (
              <img src={ann.imageData} alt="Signature" className="annotation-sig-img" draggable={false} />
            )}
            {ann.type === 'text' && (
              <span
                className="annotation-text-content"
                style={{
                  fontFamily: ann.fontFamily || 'Arial',
                  fontSize: `${ann.fontSize || 14}px`,
                  color: ann.color || '#1a1a2e'
                }}
              >
                {ann.text}
              </span>
            )}

            {/* Delete button */}
            {hovered === ann.id && !isInteractive && !isDragging && (
              <button className="annotation-delete" onClick={(e) => { e.stopPropagation(); onRemove(ann.id); }}>
                <X size={12} />
              </button>
            )}

            {/* Move / Resize controls for signatures */}
            {isMovable && !isInteractive && (hovered === ann.id || isActive) && !isDragging && (
              <>
                {/* Move handle (center) */}
                <div
                  className="ann-move-handle"
                  onMouseDown={(e) => handleMoveStart(e, ann)}
                  title="Drag to move"
                >
                  <Move size={14} />
                </div>

                {/* Resize handles */}
                <div className="ann-resize-handle ann-resize-nw" onMouseDown={(e) => handleResizeStart(e, ann, 'nw')} />
                <div className="ann-resize-handle ann-resize-ne" onMouseDown={(e) => handleResizeStart(e, ann, 'ne')} />
                <div className="ann-resize-handle ann-resize-sw" onMouseDown={(e) => handleResizeStart(e, ann, 'sw')} />
                <div className="ann-resize-handle ann-resize-se" onMouseDown={(e) => handleResizeStart(e, ann, 'se')}>
                  <Maximize2 size={8} />
                </div>

                {/* Edge resize handles */}
                <div className="ann-resize-edge ann-resize-n" onMouseDown={(e) => handleResizeStart(e, ann, 'n')} />
                <div className="ann-resize-edge ann-resize-s" onMouseDown={(e) => handleResizeStart(e, ann, 's')} />
                <div className="ann-resize-edge ann-resize-e" onMouseDown={(e) => handleResizeStart(e, ann, 'e')} />
                <div className="ann-resize-edge ann-resize-w" onMouseDown={(e) => handleResizeStart(e, ann, 'w')} />
              </>
            )}

            {/* Drag overlay for move cursor during move */}
            {isDragging && dragAction.kind === 'move' && (
              <div className="ann-drag-overlay" />
            )}
          </div>
        );
      })}

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


    </div>
  );
}
