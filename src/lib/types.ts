/** Shared types for PDF Page Master */

export interface Annotation {
  id: string;
  type: 'signature' | 'redaction' | 'text' | 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  imageData?: string;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface FormField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'checkbox' | 'dropdown';
  x: number; y: number; width: number; height: number;
  label: string;
  defaultValue: string;
  options?: string[];
}

export interface PageNumberSettings {
  enabled: boolean;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  startNumber: number;
  format: 'decimal' | 'roman-lower' | 'roman-upper';
  fontSize: number;
  margin: number;
  skipFirstPage: boolean;
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  fontSize: number;
  opacity: number;
  angle: number;
  color: string;
}

export interface Bookmark {
  id: string;
  title: string;
  pageIndex: number;
}

export interface HeaderFooterSettings {
  enabled: boolean;
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  fontSize: number;
  margin: number;
  skipFirstPage: boolean;
}

export const DEFAULT_PAGE_NUM_SETTINGS: PageNumberSettings = {
  enabled: false, position: 'bottom-center', startNumber: 1,
  format: 'decimal', fontSize: 11, margin: 36, skipFirstPage: false,
};

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  enabled: false, text: 'DRAFT', fontSize: 72, opacity: 0.12, angle: -45, color: '#6366f1',
};

export const DEFAULT_HEADER_FOOTER: HeaderFooterSettings = {
  enabled: false,
  headerLeft: '', headerCenter: '', headerRight: '',
  footerLeft: '', footerCenter: '', footerRight: '',
  fontSize: 9, margin: 36, skipFirstPage: false,
};

export function toRoman(num: number, lower: boolean): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return lower ? result.toLowerCase() : result;
}

export function formatPageNumber(num: number, format: string): string {
  if (format === 'roman-lower') return toRoman(num, true);
  if (format === 'roman-upper') return toRoman(num, false);
  return String(num);
}

export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export function substituteVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
}
