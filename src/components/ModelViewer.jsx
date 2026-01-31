import { useEffect, useRef } from 'react';
import './ModelViewer.css';

export default function ModelViewer({ modelUrl, renderedImage }) {
  const containerRef = useRef(null);
  const modelViewerLoaded = useRef(false);

  useEffect(() => {
    if (!modelViewerLoaded.current) {
      import('@google/model-viewer').then(() => {
        modelViewerLoaded.current = true;
      });
    }
  }, []);

  if (!modelUrl && !renderedImage) {
    return (
      <div className="model-viewer-placeholder">
        <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <p>Your 3D model will appear here</p>
        <span>Upload images and click Generate to get started</span>
      </div>
    );
  }

  return (
    <div className="model-viewer-container" ref={containerRef}>
      {modelUrl ? (
        <model-viewer
          src={modelUrl}
          alt="Generated 3D Model"
          auto-rotate
          camera-controls
          shadow-intensity="1"
          environment-image="neutral"
          style={{ width: '100%', height: '100%' }}
        />
      ) : renderedImage ? (
        <div className="rendered-preview">
          <img src={renderedImage} alt="Rendered preview" />
          <p>Rendered preview (3D model loading...)</p>
        </div>
      ) : null}

      {modelUrl && (
        <a
          href={modelUrl}
          download="model.glb"
          className="download-btn"
          title="Download GLB"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download GLB
        </a>
      )}
    </div>
  );
}
