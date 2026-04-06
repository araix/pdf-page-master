import React, { useRef, useState, useEffect } from 'react';
import { Paintbrush, Type, Upload, Eraser } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

type TabMode = 'draw' | 'type' | 'upload';

const CURSIVE_FONTS = [
  { name: 'Dancing Script', label: 'Dancing Script' },
  { name: 'Caveat', label: 'Caveat' },
  { name: 'Great Vibes', label: 'Great Vibes' },
];

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const [tab, setTab] = useState<TabMode>('draw');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(CURSIVE_FONTS[0].name);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setHasDrawn(false);
    }
  }, [tab]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawn(false);
  };

  const trimCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let top = height, bottom = 0, left = width, right = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx] < 250 || data[idx + 1] < 250 || data[idx + 2] < 250) {
          if (y < top) top = y; if (y > bottom) bottom = y;
          if (x < left) left = x; if (x > right) right = x;
        }
      }
    }
    if (top >= bottom) return canvas;
    const pad = 10;
    const w = right - left + 1 + pad * 2;
    const h = bottom - top + 1 + pad * 2;
    const trimmed = document.createElement('canvas');
    trimmed.width = w; trimmed.height = h;
    const tCtx = trimmed.getContext('2d')!;
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, w, h);
    tCtx.drawImage(canvas, left - pad, top - pad, w, h, 0, 0, w, h);
    return trimmed;
  };

  const handleSave = () => {
    if (tab === 'draw') {
      if (!hasDrawn) return;
      const trimmed = trimCanvas(canvasRef.current!);
      onSave(trimmed.toDataURL('image/png'));
    } else if (tab === 'type') {
      if (!typedName.trim()) return;
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d')!;
      const size = 48;
      ctx.font = `${size}px "${selectedFont}"`;
      const m = ctx.measureText(typedName);
      c.width = m.width + 40; c.height = size * 1.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = `${size}px "${selectedFont}"`;
      ctx.fillStyle = '#1a1a2e';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 20, c.height / 2);
      onSave(c.toDataURL('image/png'));
    } else if (tab === 'upload' && uploadedImage) {
      onSave(uploadedImage);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSave = (tab === 'draw' && hasDrawn) || (tab === 'type' && typedName.trim()) || (tab === 'upload' && uploadedImage);

  return (
    <div className="sig-pad">
      <div className="sig-tabs">
        <button className={`sig-tab ${tab === 'draw' ? 'active' : ''}`} onClick={() => setTab('draw')}>
          <Paintbrush size={14} /> Draw
        </button>
        <button className={`sig-tab ${tab === 'type' ? 'active' : ''}`} onClick={() => setTab('type')}>
          <Type size={14} /> Type
        </button>
        <button className={`sig-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          <Upload size={14} /> Upload
        </button>
      </div>

      <div className="sig-content">
        {tab === 'draw' && (
          <div className="sig-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={560}
              height={200}
              className="sig-canvas"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <button className="sig-clear-btn" onClick={clearCanvas} title="Clear">
              <Eraser size={14} /> Clear
            </button>
          </div>
        )}

        {tab === 'type' && (
          <div className="sig-type-wrap">
            <input
              type="text"
              className="sig-type-input"
              placeholder="Type your signature"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              autoFocus
            />
            <div className="sig-font-picker">
              {CURSIVE_FONTS.map((f) => (
                <button
                  key={f.name}
                  className={`sig-font-btn ${selectedFont === f.name ? 'active' : ''}`}
                  onClick={() => setSelectedFont(f.name)}
                  style={{ fontFamily: `"${f.name}", cursive` }}
                >
                  {typedName || 'Preview'}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div className="sig-upload-wrap">
            {uploadedImage ? (
              <div className="sig-upload-preview">
                <img src={uploadedImage} alt="Uploaded signature" />
                <button className="sig-clear-btn" onClick={() => setUploadedImage(null)}>
                  <Eraser size={14} /> Remove
                </button>
              </div>
            ) : (
              <label className="sig-upload-zone">
                <Upload size={28} />
                <span>Click to upload signature image</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        )}
      </div>

      <div className="sig-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
          Use This Signature
        </button>
      </div>
    </div>
  );
}
