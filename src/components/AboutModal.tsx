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
        <p className="about-version">Version 1.1.0</p>
        <p className="about-description">
          A professional-grade, privacy-focused PDF manipulation tool. 
          Perform complex PDF tasks entirely in your browser—no files are uploaded to any server.
        </p>
      </div>

      <div className="about-section">
        <h4>Key Features</h4>
        <ul className="about-features">
          <li>Merge, Split, and Reorder pages visually</li>
          <li>Add Digital Signatures and Annotations</li>
          <li>Insert Watermarks, Headers, and Footers</li>
          <li>Manage Page Numbers and Bookmarks</li>
          <li>Fill PDF Forms and redact sensitive info</li>
          <li>Convert between Images and PDFs</li>
        </ul>
      </div>

      <div className="about-section">
        <p className="about-site">
          Official Site: <a href="https://pdf.araix.net/" target="_blank" rel="noopener noreferrer">pdf.araix.net</a>
        </p>
        <p className="about-tech">
          Built with React, TypeScript, and high-performance PDF engines.
        </p>
        <p className="about-copyright">
          © {new Date().getFullYear()} PDF Page Master.
        </p>
      </div>

      <div className="about-donate">
        <button className="btn btn-primary donate-btn" onClick={onDonate}>
          <Heart size={16} /> Support the Developer
        </button>
      </div>
    </div>
  );
}
