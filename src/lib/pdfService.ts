import { PDFDocument, PDFName, PDFHexString, PDFNumber, degrees, rgb, StandardFonts } from 'pdf-lib';
import type { PDFDict, PDFRef } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  Annotation, PageNumberSettings, WatermarkSettings,
  FormField, Bookmark, HeaderFooterSettings,
} from './types';
import { formatPageNumber, hexToRgb01, substituteVars } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PageInfo {
  id: string;
  fileId: string;
  fileName: string;
  pageIndex: number;
  thumbnail: string;
  fullPreview: string;
  pageWidth: number;
  pageHeight: number;
  rotation: number;
  formFields: FormField[];
}

export interface ExportOptions {
  annotations?: Record<string, Annotation[]>;
  pageNumberSettings?: PageNumberSettings;
  watermarkSettings?: WatermarkSettings;
  headerFooterSettings?: HeaderFooterSettings;
  formValues?: Record<string, Record<string, string>>;
  bookmarks?: Bookmark[];
  compression?: 'none' | 'medium' | 'high';
}

// ─── File Data Store ────────────────────────────────────
const fileDataStore = new Map<string, Uint8Array>();
export function storeFileData(fileId: string, data: Uint8Array) { fileDataStore.set(fileId, data); }
export function getFileData(fileId: string) { return fileDataStore.get(fileId); }
export function clearAllFileData() { fileDataStore.clear(); }
export function getStoredFileIds() { return [...fileDataStore.keys()]; }
export function getAllFileEntries(): Array<[string, Uint8Array]> { return [...fileDataStore.entries()]; }

// ─── Rendering ──────────────────────────────────────────
async function renderPageToDataUrl(page: pdfjsLib.PDFPageProxy, scale: number, quality: number): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = viewport.width; canvas.height = viewport.height;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const url = canvas.toDataURL('image/jpeg', quality);
  canvas.width = 0; canvas.height = 0;
  return url;
}

async function extractFormFields(page: pdfjsLib.PDFPageProxy, vp: { width: number; height: number }): Promise<FormField[]> {
  try {
    const anns = await page.getAnnotations();
    return anns.filter((a: any) => a.subtype === 'Widget').map((a: any) => {
      const [x1, y1, x2, y2] = a.rect;
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      let ft: FormField['fieldType'] = 'text';
      if (a.fieldType === 'Btn') ft = 'checkbox';
      else if (a.fieldType === 'Ch') ft = 'dropdown';
      return {
        id: a.id || `f_${Math.random().toString(36).slice(2, 8)}`,
        fieldName: a.fieldName || a.id || '', fieldType: ft,
        x: minX / vp.width, y: 1 - maxY / vp.height,
        width: (maxX - minX) / vp.width, height: (maxY - minY) / vp.height,
        label: a.alternativeText || a.fieldName || '',
        defaultValue: a.fieldValue || '',
        options: a.options?.map((o: any) => o.displayValue || o.exportValue || '') || [],
      };
    });
  } catch { return []; }
}

// ─── Page Extraction ────────────────────────────────────
export async function getPdfPages(file: File): Promise<PageInfo[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  if (!data.length) throw new Error('The selected file is empty.');
  const fileId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  storeFileData(fileId, data);
  const pdf = await pdfjsLib.getDocument({ data: data.slice(0), useSystemFonts: true }).promise;
  const pages: PageInfo[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1.0 });
    const thumbnail = await renderPageToDataUrl(page, 0.3, 0.6);
    const fullPreview = await renderPageToDataUrl(page, 1.5, 0.85);
    const formFields = await extractFormFields(page, vp);
    pages.push({
      id: `${fileId}_p${i - 1}`, fileId, fileName: file.name, pageIndex: i - 1,
      thumbnail, fullPreview, pageWidth: vp.width, pageHeight: vp.height,
      rotation: 0, formFields,
    });
    page.cleanup();
  }
  pdf.destroy();
  return pages;
}

// ─── Image to PDF Page ──────────────────────────────────
export async function imageToPageInfo(file: File): Promise<PageInfo> {
  const fileId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const arrayBuf = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.create();
  let pdfImage;
  if (file.type.includes('png')) {
    pdfImage = await pdfDoc.embedPng(arrayBuf);
  } else {
    pdfImage = await pdfDoc.embedJpg(arrayBuf);
  }
  const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
  page.drawImage(pdfImage, { x: 0, y: 0, width: pdfImage.width, height: pdfImage.height });
  const pdfBytes = await pdfDoc.save();
  storeFileData(fileId, new Uint8Array(pdfBytes));

  // Create preview from the image
  const imgDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  // Create thumbnail
  const thumbCanvas = document.createElement('canvas');
  const img = await new Promise<HTMLImageElement>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.src = imgDataUrl;
  });
  const scale = Math.min(150 / img.width, 200 / img.height, 1);
  thumbCanvas.width = img.width * scale;
  thumbCanvas.height = img.height * scale;
  const tCtx = thumbCanvas.getContext('2d')!;
  tCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);
  thumbCanvas.width = 0; thumbCanvas.height = 0;

  return {
    id: `${fileId}_p0`, fileId, fileName: file.name, pageIndex: 0,
    thumbnail, fullPreview: imgDataUrl,
    pageWidth: pdfImage.width, pageHeight: pdfImage.height,
    rotation: 0, formFields: [],
  };
}

// ─── PDF to Image Export ────────────────────────────────
export function downloadPageAsImage(page: PageInfo, format: 'png' | 'jpeg' = 'png') {
  // Re-render to the desired format
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.92 : undefined);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${page.fileName.replace(/\.\w+$/, '')}_page${page.pageIndex + 1}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    link.click();
    canvas.width = 0; canvas.height = 0;
  };
  img.src = page.fullPreview;
}

export function downloadAllPagesAsImages(pages: PageInfo[], format: 'png' | 'jpeg' = 'png') {
  pages.forEach((p, i) => setTimeout(() => downloadPageAsImage(p, format), i * 400));
}

// ─── Duplicate ──────────────────────────────────────────
export function duplicatePageInfo(page: PageInfo): PageInfo {
  return { ...page, id: `${page.fileId}_p${page.pageIndex}_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
}

// ─── Single Page Download ───────────────────────────────
export async function downloadSinglePage(page: PageInfo) {
  const fileData = getFileData(page.fileId);
  if (!fileData) throw new Error(`Missing PDF data for "${page.fileName}".`);
  const srcDoc = await PDFDocument.load(fileData.slice(0), { ignoreEncryption: true, updateMetadata: false });
  const singlePdf = await PDFDocument.create();
  const [cp] = await singlePdf.copyPages(srcDoc, [page.pageIndex]);
  if (page.rotation) cp.setRotation(degrees(page.rotation));
  singlePdf.addPage(cp);
  downloadPdf(await singlePdf.save(), `${page.fileName.replace(/\.pdf$/i, '')}_page${page.pageIndex + 1}.pdf`);
}

// ─── Compress PDF ───────────────────────────────────────
export async function compressPdfBytes(pdfBytes: Uint8Array, level: 'medium' | 'high'): Promise<Uint8Array> {
  const cfg = level === 'medium' ? { scale: 1.0, q: 0.55 } : { scale: 0.75, q: 0.35 };
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
  const newDoc = await PDFDocument.create();
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const origVp = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: cfg.scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const jpgDataUrl = canvas.toDataURL('image/jpeg', cfg.q);
    const jpgBytes = await fetch(jpgDataUrl).then((r) => r.arrayBuffer());
    const img = await newDoc.embedJpg(jpgBytes);
    const np = newDoc.addPage([origVp.width, origVp.height]);
    np.drawImage(img, { x: 0, y: 0, width: origVp.width, height: origVp.height });
    canvas.width = 0; canvas.height = 0;
    page.cleanup();
  }
  pdf.destroy();
  return newDoc.save();
}

// ─── Bookmarks ──────────────────────────────────────────
function addBookmarksToPdf(doc: PDFDocument, bookmarks: Bookmark[]) {
  if (!bookmarks.length) return;
  const ctx = doc.context;
  const pages = doc.getPages();
  const itemRefs: PDFRef[] = [];
  const itemDicts: PDFDict[] = [];

  for (const bm of bookmarks) {
    const pi = Math.min(bm.pageIndex, pages.length - 1);
    const pageRef = pages[pi].ref;
    const dict = ctx.obj({}) as unknown as PDFDict;
    dict.set(PDFName.of('Title'), PDFHexString.fromText(bm.title));
    dict.set(PDFName.of('Dest'), ctx.obj([pageRef, PDFName.of('Fit')]));
    const ref = ctx.register(dict);
    itemRefs.push(ref);
    itemDicts.push(dict);
  }

  for (let i = 0; i < itemRefs.length; i++) {
    if (i > 0) itemDicts[i].set(PDFName.of('Prev'), itemRefs[i - 1]);
    if (i < itemRefs.length - 1) itemDicts[i].set(PDFName.of('Next'), itemRefs[i + 1]);
  }

  const outlines = ctx.obj({}) as unknown as PDFDict;
  outlines.set(PDFName.of('Type'), PDFName.of('Outlines'));
  outlines.set(PDFName.of('First'), itemRefs[0]);
  outlines.set(PDFName.of('Last'), itemRefs[itemRefs.length - 1]);
  outlines.set(PDFName.of('Count'), PDFNumber.of(itemRefs.length));
  const outlinesRef = ctx.register(outlines);

  for (const d of itemDicts) d.set(PDFName.of('Parent'), outlinesRef);
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
}

// ─── Merge & Export ─────────────────────────────────────
export async function mergePdfPages(pages: PageInfo[], options: ExportOptions = {}): Promise<Uint8Array> {
  if (!pages.length) throw new Error('No pages to merge.');
  const mergedPdf = await PDFDocument.create();
  const helvetica = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const loadedDocs = new Map<string, PDFDocument>();
  const { annotations, pageNumberSettings, watermarkSettings, headerFooterSettings, formValues, bookmarks, compression } = options;

  // Pre-fill forms
  if (formValues) {
    for (const pi of pages) {
      const vals = formValues[pi.id];
      if (!vals || !Object.keys(vals).length) continue;
      const fd = getFileData(pi.fileId);
      if (!fd || loadedDocs.has(pi.fileId)) continue;
      const doc = await PDFDocument.load(fd.slice(0), { ignoreEncryption: true, updateMetadata: false });
      try {
        const form = doc.getForm();
        for (const [fn, v] of Object.entries(vals)) {
          try { form.getTextField(fn).setText(v); } catch {
            try { v === 'true' ? form.getCheckBox(fn).check() : form.getCheckBox(fn).uncheck(); } catch {}
          }
        }
        form.flatten();
      } catch {}
      loadedDocs.set(pi.fileId, doc);
    }
  }

  const totalPages = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const pi = pages[i];
    const fd = getFileData(pi.fileId);
    if (!fd) throw new Error(`Missing PDF data for "${pi.fileName}".`);
    if (!loadedDocs.has(pi.fileId)) {
      loadedDocs.set(pi.fileId, await PDFDocument.load(fd.slice(0), { ignoreEncryption: true, updateMetadata: false }));
    }
    const [cp] = await mergedPdf.copyPages(loadedDocs.get(pi.fileId)!, [pi.pageIndex]);
    if (pi.rotation) cp.setRotation(degrees(pi.rotation));

    // Annotations
    for (const ann of (annotations?.[pi.id] || [])) {
      const { width: pw, height: ph } = cp.getSize();
      if (ann.type === 'redaction') {
        cp.drawRectangle({ x: ann.x * pw, y: (1 - ann.y - ann.height) * ph, width: ann.width * pw, height: ann.height * ph, color: rgb(0, 0, 0) });
      } else if (ann.type === 'highlight') {
        cp.drawRectangle({ x: ann.x * pw, y: (1 - ann.y - ann.height) * ph, width: ann.width * pw, height: ann.height * ph, color: rgb(1, 0.92, 0.23), opacity: 0.35 });
      } else if (ann.type === 'text' && ann.text) {
        const fs = ann.fontSize || 14;
        const c = ann.color ? hexToRgb01(ann.color) : { r: 0.1, g: 0.1, b: 0.18 };
        cp.drawText(ann.text, { x: ann.x * pw, y: (1 - ann.y) * ph - fs, size: fs, font: helvetica, color: rgb(c.r, c.g, c.b) });
      } else if (ann.type === 'signature' && ann.imageData) {
        try {
          const imgBytes = await fetch(ann.imageData).then((r) => r.arrayBuffer());
          const img = ann.imageData.includes('image/png')
            ? await mergedPdf.embedPng(imgBytes) : await mergedPdf.embedJpg(imgBytes);
          cp.drawImage(img, { x: ann.x * pw, y: (1 - ann.y - ann.height) * ph, width: ann.width * pw, height: ann.height * ph });
        } catch (err) { console.error('Signature embed failed:', err); }
      }
    }

    // Watermark
    if (watermarkSettings?.enabled && watermarkSettings.text) {
      const { width: pw, height: ph } = cp.getSize();
      const c = hexToRgb01(watermarkSettings.color);
      const tw = helvetica.widthOfTextAtSize(watermarkSettings.text, watermarkSettings.fontSize);
      cp.drawText(watermarkSettings.text, {
        x: pw / 2 - tw / 2, y: ph / 2,
        size: watermarkSettings.fontSize, font: helvetica,
        color: rgb(c.r, c.g, c.b), opacity: watermarkSettings.opacity, rotate: degrees(watermarkSettings.angle),
      });
    }

    // Page numbers
    if (pageNumberSettings?.enabled && !(pageNumberSettings.skipFirstPage && i === 0)) {
      const text = formatPageNumber(i + pageNumberSettings.startNumber, pageNumberSettings.format);
      const { width: pw, height: ph } = cp.getSize();
      const tw = helvetica.widthOfTextAtSize(text, pageNumberSettings.fontSize);
      const m = pageNumberSettings.margin;
      const pos = pageNumberSettings.position;
      let x = pos.includes('left') ? m : pos.includes('center') ? pw / 2 - tw / 2 : pw - tw - m;
      let y = pos.includes('top') ? ph - m : m;
      cp.drawText(text, { x, y, size: pageNumberSettings.fontSize, font: helvetica, color: rgb(0.3, 0.3, 0.3) });
    }

    // Headers & Footers
    if (headerFooterSettings?.enabled && !(headerFooterSettings.skipFirstPage && i === 0)) {
      const { width: pw, height: ph } = cp.getSize();
      const m = headerFooterSettings.margin;
      const fs = headerFooterSettings.fontSize;
      const vars: Record<string, string> = {
        page: String(i + 1), total: String(totalPages),
        date: new Date().toLocaleDateString(), filename: pi.fileName,
      };
      const drawHF = (text: string, x: number, y: number, align: 'left' | 'center' | 'right') => {
        if (!text) return;
        const rendered = substituteVars(text, vars);
        const tw = helvetica.widthOfTextAtSize(rendered, fs);
        let ax = x;
        if (align === 'center') ax = x - tw / 2;
        else if (align === 'right') ax = x - tw;
        cp.drawText(rendered, { x: ax, y, size: fs, font: helvetica, color: rgb(0.35, 0.35, 0.35) });
      };
      // Header
      drawHF(headerFooterSettings.headerLeft, m, ph - m, 'left');
      drawHF(headerFooterSettings.headerCenter, pw / 2, ph - m, 'center');
      drawHF(headerFooterSettings.headerRight, pw - m, ph - m, 'right');
      // Footer
      drawHF(headerFooterSettings.footerLeft, m, m, 'left');
      drawHF(headerFooterSettings.footerCenter, pw / 2, m, 'center');
      drawHF(headerFooterSettings.footerRight, pw - m, m, 'right');
    }

    mergedPdf.addPage(cp);
  }

  if (!mergedPdf.getPageCount()) throw new Error('No pages added.');

  // Bookmarks
  if (bookmarks?.length) addBookmarksToPdf(mergedPdf, bookmarks);

  let pdfBytes = await mergedPdf.save();

  // Compress
  if (compression && compression !== 'none') {
    pdfBytes = await compressPdfBytes(pdfBytes, compression);
  }

  return pdfBytes;
}

// ─── Download ───────────────────────────────────────────
export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  const header = String.fromCharCode(...pdfBytes.slice(0, 5));
  if (!header.startsWith('%PDF')) { alert('Invalid PDF. Please try again.'); return; }
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.style.display = 'none';
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
