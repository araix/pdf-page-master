import React from 'react';
import type { PageNumberSettings } from '../lib/types';

interface Props {
  settings: PageNumberSettings;
  onChange: (s: PageNumberSettings) => void;
}

export default function PageNumberConfig({ settings, onChange }: Props) {
  const update = <K extends keyof PageNumberSettings>(key: K, val: PageNumberSettings[K]) =>
    onChange({ ...settings, [key]: val });

  return (
    <div className="config-form">
      <label className="config-toggle">
        <span>Enable Page Numbers</span>
        <input type="checkbox" checked={settings.enabled} onChange={(e) => update('enabled', e.target.checked)} />
        <span className="toggle-switch" />
      </label>

      <div className={`config-fields ${settings.enabled ? '' : 'disabled'}`}>
        <div className="config-group">
          <label>Position</label>
          <div className="position-grid">
            {(['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right'] as const).map((pos) => (
              <button
                key={pos}
                className={`position-btn ${settings.position === pos ? 'active' : ''}`}
                onClick={() => update('position', pos)}
              >
                <span className="position-dot" />
              </button>
            ))}
          </div>
        </div>

        <div className="config-row">
          <div className="config-group">
            <label>Start Number</label>
            <input
              type="number"
              className="config-input"
              value={settings.startNumber}
              onChange={(e) => update('startNumber', parseInt(e.target.value) || 1)}
              min={1}
            />
          </div>
          <div className="config-group">
            <label>Format</label>
            <select className="config-input" value={settings.format} onChange={(e) => update('format', e.target.value as any)}>
              <option value="decimal">1, 2, 3…</option>
              <option value="roman-lower">i, ii, iii…</option>
              <option value="roman-upper">I, II, III…</option>
            </select>
          </div>
        </div>

        <div className="config-row">
          <div className="config-group">
            <label>Font Size: {settings.fontSize}pt</label>
            <input
              type="range"
              min={8}
              max={24}
              value={settings.fontSize}
              onChange={(e) => update('fontSize', parseInt(e.target.value))}
            />
          </div>
          <div className="config-group">
            <label>Margin: {settings.margin}pt</label>
            <input
              type="range"
              min={12}
              max={72}
              value={settings.margin}
              onChange={(e) => update('margin', parseInt(e.target.value))}
            />
          </div>
        </div>

        <label className="config-toggle">
          <span>Skip First Page</span>
          <input type="checkbox" checked={settings.skipFirstPage} onChange={(e) => update('skipFirstPage', e.target.checked)} />
          <span className="toggle-switch" />
        </label>
      </div>
    </div>
  );
}
