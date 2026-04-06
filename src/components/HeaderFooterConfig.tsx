import React from 'react';
import type { HeaderFooterSettings } from '../lib/types';

interface Props {
  settings: HeaderFooterSettings;
  onChange: (s: HeaderFooterSettings) => void;
}

export default function HeaderFooterConfig({ settings, onChange }: Props) {
  const update = <K extends keyof HeaderFooterSettings>(key: K, val: HeaderFooterSettings[K]) =>
    onChange({ ...settings, [key]: val });

  const fieldRow = (label: string, leftKey: keyof HeaderFooterSettings, centerKey: keyof HeaderFooterSettings, rightKey: keyof HeaderFooterSettings) => (
    <div className="config-group">
      <label>{label}</label>
      <div className="hf-triple-row">
        <input className="config-input" placeholder="Left" value={settings[leftKey] as string} onChange={(e) => update(leftKey, e.target.value)} />
        <input className="config-input" placeholder="Center" value={settings[centerKey] as string} onChange={(e) => update(centerKey, e.target.value)} />
        <input className="config-input" placeholder="Right" value={settings[rightKey] as string} onChange={(e) => update(rightKey, e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="config-form">
      <label className="config-toggle">
        <span>Enable Headers & Footers</span>
        <input type="checkbox" checked={settings.enabled} onChange={(e) => update('enabled', e.target.checked)} />
        <span className="toggle-switch" />
      </label>

      <div className={`config-fields ${settings.enabled ? '' : 'disabled'}`}>
        {fieldRow('Header', 'headerLeft', 'headerCenter', 'headerRight')}
        {fieldRow('Footer', 'footerLeft', 'footerCenter', 'footerRight')}

        <div className="config-group">
          <label>Available Variables</label>
          <div className="hf-vars">
            {['{page}', '{total}', '{date}', '{filename}'].map((v) => (
              <code key={v} className="hf-var-tag">{v}</code>
            ))}
          </div>
        </div>

        <div className="config-row">
          <div className="config-group">
            <label>Font Size: {settings.fontSize}pt</label>
            <input type="range" min={6} max={16} value={settings.fontSize} onChange={(e) => update('fontSize', parseInt(e.target.value))} />
          </div>
          <div className="config-group">
            <label>Margin: {settings.margin}pt</label>
            <input type="range" min={18} max={72} value={settings.margin} onChange={(e) => update('margin', parseInt(e.target.value))} />
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
