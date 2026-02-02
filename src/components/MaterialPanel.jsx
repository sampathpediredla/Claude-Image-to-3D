import './MaterialPanel.css';

/**
 * Shows Material ID layers extracted from the model with visibility toggles.
 *
 * Props:
 *  - layers: array of { index, color, name, percentage, faceCount, visible }
 *  - onToggleLayer: (index) => void
 *  - onRenameLayer: (index, newName) => void
 */
export default function MaterialPanel({ layers, onToggleLayer, onRenameLayer }) {
  if (!layers || layers.length === 0) {
    return (
      <div className="material-panel">
        <div className="panel-header">
          <h3>Material ID Layers</h3>
        </div>
        <div className="panel-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ opacity: 0.4 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <p>No layers yet</p>
          <span>Upload a Material ID image and generate a model to see layers here.</span>
        </div>
      </div>
    );
  }

  const totalFaces = layers.reduce((sum, l) => sum + l.faceCount, 0);

  return (
    <div className="material-panel">
      <div className="panel-header">
        <h3>Material ID Layers</h3>
        <span className="mat-count">{layers.length} layers</span>
      </div>

      <div className="layer-stats">
        <span>{totalFaces.toLocaleString()} faces total</span>
      </div>

      <div className="material-list">
        {layers.map((layer) => (
          <div key={layer.index} className={`layer-row ${!layer.visible ? 'hidden-layer' : ''}`}>
            <button
              className="visibility-btn"
              onClick={() => onToggleLayer && onToggleLayer(layer.index)}
              title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              {layer.visible ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>

            <div className="layer-swatch" style={{ background: layer.color }} />

            <div className="layer-info">
              <input
                className="layer-name-input"
                value={layer.name}
                onChange={(e) => onRenameLayer && onRenameLayer(layer.index, e.target.value)}
                title="Click to rename layer"
              />
              <div className="layer-meta">
                <span className="layer-hex">{layer.color.toUpperCase()}</span>
                <span className="layer-sep">&middot;</span>
                <span>{layer.faceCount.toLocaleString()} faces</span>
                <span className="layer-sep">&middot;</span>
                <span>{layer.percentage}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
