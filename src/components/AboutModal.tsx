import React from 'react';
import { Heart } from 'lucide-react';

interface AboutModalProps {
  onDonate: () => void;
}

export default function AboutModal({ onDonate }: AboutModalProps) {
  return (
    <div className="about-modal-content">
      <div className="about-section">
        <h4>PDF Page Master</h4>
        <p className="about-version">Version 1.0.0</p>
        <p className="about-description">
          A powerful browser-based PDF manipulation tool for merging, reordering, 
          annotating, and customizing PDF documents with an intuitive drag-and-drop interface.
        </p>
      </div>

      <div className="about-section">
        <h4>Features</h4>
        <ul className="about-features">
          <li>Multi-file PDF and image support</li>
          <li>Visual page reordering and rotation</li>
          <li>Digital signatures and annotations</li>
          <li>Watermarks, headers, and footers</li>
          <li>Page numbers and bookmarks</li>
          <li>Form filling and compression</li>
        </ul>
      </div>

      <div className="about-section">
        <p className="about-copyright">
          © {new Date().getFullYear()} PDF Page Master. All rights reserved.
        </p>
        <p className="about-tech">
          Built with React, TypeScript, pdf-lib, and PDF.js
        </p>
      </div>

      <div className="about-donate">
        <button className="btn btn-primary donate-btn" onClick={onDonate}>
          <Heart size={16} /> Support This Project
        </button>
      </div>
    </div>
  );
}
