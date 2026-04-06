import React, { useState } from 'react';
import { Type } from 'lucide-react';

interface TextAnnotationPadProps {
  onSave: (settings: { text: string; fontFamily: string; fontSize: number; color: string }) => void;
  onCancel: () => void;
}

const FONTS = [
  { name: 'Arial', label: 'Arial' },
  { name: 'Times New Roman', label: 'Times New Roman' },
  { name: 'Helvetica', label: 'Helvetica' },
  { name: 'Georgia', label: 'Georgia' },
  { name: 'Verdana', label: 'Verdana' },
  { name: 'Courier New', label: 'Courier New' },
];

const COLORS = [
  '#1a1a2e', '#000000', '#6366f1', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed', '#0891b2'
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

export default function TextAnnotationPad({ onSave, onCancel }: TextAnnotationPadProps) {
  const [text, setText] = useState('');
  const [fontFamily, setFontFamily] = useState(FONTS[0].name);
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState('#1a1a2e');

  const handleSave = () => {
    if (text.trim()) {
      onSave({ text: text.trim(), fontFamily, fontSize, color });
    }
  };

  const canSave = text.trim().length > 0;

  return (
    <div className="text-ann-pad">
      <div className="text-ann-tabs">
        <div className="text-ann-tab active">
          <Type size={14} /> Text Settings
        </div>
      </div>

      <div className="text-ann-content">
        <div className="text-ann-input-section">
          <label htmlFor="text-input">Text Content:</label>
          <textarea
            id="text-input"
            className="text-ann-textarea"
            placeholder="Enter your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            rows={4}
          />
        </div>

        <div className="text-ann-settings">
          <div className="text-ann-setting">
            <label>Font:</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="text-ann-select"
            >
              {FONTS.map((font) => (
                <option key={font.name} value={font.name}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-ann-setting">
            <label>Size:</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="text-ann-select"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>

          <div className="text-ann-setting">
            <label>Color:</label>
            <div className="text-ann-colors">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`text-ann-color-btn ${color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-ann-preview">
          <label>Preview:</label>
          <div
            className="text-ann-preview-text"
            style={{
              fontFamily,
              fontSize: `${fontSize}px`,
              color,
            }}
          >
            {text || 'Your text will appear here'}
          </div>
        </div>
      </div>

      <div className="text-ann-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
          Add Text
        </button>
      </div>
    </div>
  );
}