# PDF Page Master

A powerful browser-based PDF manipulation tool that lets you merge, reorder, annotate, and customize PDF documents with an intuitive drag-and-drop interface.

## Features

### Core Functionality
- **Multi-file support**: Upload multiple PDFs and images (PNG, JPEG, WebP)
- **Visual reordering**: Drag and drop pages to rearrange them
- **Page rotation**: Rotate pages clockwise or counterclockwise
- **Multi-select**: Select multiple pages for batch operations
- **Duplicate pages**: Clone pages with a single click
- **Split & export**: Download individual pages or selected page ranges

### Advanced Editing
- **Digital signatures**: Draw or upload signatures and place them on pages
- **Redaction**: Black out sensitive information with redaction boxes
- **Text annotations**: Add custom text anywhere on your pages
- **Highlighting**: Highlight important sections
- **Form filling**: Fill out PDF forms directly in the browser

### Document Customization
- **Page numbers**: Add customizable page numbers with multiple formats (1, i, I, a, A)
- **Watermarks**: Apply text watermarks with custom angle, opacity, and color
- **Headers & Footers**: Add dynamic headers and footers with variables (page, total, date, filename)
- **Bookmarks**: Create a table of contents with clickable bookmarks
- **Compression**: Export with optional compression (medium or high)

### User Experience
- **Session recovery**: Automatically saves your work and offers to restore previous sessions
- **Zoom controls**: Adjust preview size from 40% to 200%
- **Responsive sidebar**: Collapsible page list with thumbnails
- **Live preview**: See watermarks, page numbers, and headers/footers in real-time
- **Export as images**: Convert all pages to PNG images

## Run Locally

**Prerequisites:** Node.js (v16 or higher recommended)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## Deployment

### Cloudflare Pages

This app can be deployed as a static site on Cloudflare Pages.

1. Push your code to a Git repository (e.g., GitHub, GitLab).

2. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages).

3. Click "Create a project" and connect your Git repository.

4. Configure the build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: (leave empty, or `/` if needed)

5. Click "Save and Deploy". Cloudflare will build and deploy your app automatically.

Your PDF Page Master app will be live on Cloudflare Pages!

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **pdf-lib** for PDF manipulation
- **pdfjs-dist** for PDF rendering
- **lucide-react** for icons

## Usage Tips

- Drag PDF files or images directly onto the drop zone
- Hold Shift to select a range of pages
- Use the toolbar buttons for quick actions on selected pages
- All changes are auto-saved and can be recovered if you close the browser
- Click the tool icons in the header to add page numbers, watermarks, or bookmarks
- Hover over any page preview to access quick actions like rotate, duplicate, sign, or redact

## License

This project uses PDF.js (Apache 2.0). Font licenses are available in the PDF.js repository.
