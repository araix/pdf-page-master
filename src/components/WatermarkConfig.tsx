import React from 'react';
import type { WatermarkSettings } from '../lib/types';

interface Props {
  settings: WatermarkSettings;
  onChange: (s: WatermarkSettings) => void;
}

export default function WatermarkConfig({ settings, onChange }: Props) {
  const update = <K extends keyof WatermarkSettings>(key: K, val: WatermarkSettings[K]) =>
    onChange({ ...settings, [key]: val });

  return (
    <div className="config-form">
      <label className="config-toggle">
        <span>Enable Watermark</span>
        <input type="checkbox" checked={settings.enabled} onChange={(e) => update('enabled', e.target.checked)} />
        <span className="toggle-switch" />
      </label>

      <div className={`config-fields ${settings.enabled ? '' : 'disabled'}`}>
        <div className="config-group">
          <label>Text</label>
          <input
            type="text"
            className="config-input"
            value={settings.text}
            onChange={(e) => update('text', e.target.value)}
            placeholder="e.g. DRAFT, CONFIDENTIAL"
          />
        </div>

        <div className="config-row">
          <div className="config-group">
            <label>Font Size: {settings.fontSize}pt</label>
            <input type="range" min={24} max={144} value={settings.fontSize} onChange={(e) => update('fontSize', parseInt(e.target.value))} />
          </div>
          <div className="config-group">
            <label>Opacity: {Math.round(settings.opacity * 100)}%</label>
            <input type="range" min={1} max={50} value={Math.round(settings.opacity * 100)} onChange={(e) => update('opacity', parseInt(e.target.value) / 100)} />
          </div>
        </div>

        <div className="config-row">
          <div className="config-group">
            <label>Angle: {settings.angle}°</label>
            <input type="range" min={-90} max={90} value={settings.angle} onChange={(e) => update('angle', parseInt(e.target.value))} />
          </div>
          <div className="config-group">
            <label>Color</label>
            <div className="color-picker-row">
              <input type="color" value={settings.color} onChange={(e) => update('color', e.target.value)} className="color-input" />
              <span className="color-hex">{settings.color}</span>
            </div>
          </div>
        </div>

        <div className="watermark-preview">
          <div className="watermark-preview-box">
            <span
              style={{
                fontSize: `${Math.min(settings.fontSize / 3, 32)}px`,
                opacity: settings.opacity * 3,
                transform: `rotate(${settings.angle}deg)`,
                color: settings.color,
                fontWeight: 800,
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              {settings.text || 'WATERMARK'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
