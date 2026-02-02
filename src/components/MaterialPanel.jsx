import { useState } from 'react';
import './MaterialPanel.css';

export default function MaterialPanel({ materials }) {
  const [expanded, setExpanded] = useState(null);

  if (!materials || materials.length === 0) {
    return (
      <div className="material-panel">
        <div className="panel-header">
          <h3>Materials</h3>
        </div>
        <div className="panel-empty">
          No materials extracted yet. Generate a 3D model to see material data.
        </div>
      </div>
    );
  }

  return (
    <div className="material-panel">
      <div className="panel-header">
        <h3>Materials</h3>
        <span className="mat-count">{materials.length} found</span>
      </div>

      <div className="material-list">
        {materials.map((mat, i) => (
          <div
            key={mat.id}
            className={`material-card ${expanded === i ? 'expanded' : ''}`}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="mat-summary">
              <div className="mat-swatch" style={{ background: mat.color }} />
              <div className="mat-info">
                <span className="mat-name">{mat.name}</span>
                <span className="mat-type">{mat.type}</span>
              </div>
              <span className="mat-hex">{mat.color.toUpperCase()}</span>
              <svg
                className={`mat-chevron ${expanded === i ? 'open' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" width="16" height="16"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {expanded === i && (
              <div className="mat-details">
                <div className="mat-detail-grid">
                  <DetailRow label="Color" value={mat.color.toUpperCase()}>
                    <div className="detail-swatch" style={{ background: mat.color }} />
                  </DetailRow>
                  <DetailRow label="Emissive" value={mat.emissive.toUpperCase()}>
                    <div className="detail-swatch" style={{ background: mat.emissive }} />
                  </DetailRow>
                  <DetailRow label="Metalness" value={mat.metalness.toFixed(2)} />
                  <DetailRow label="Roughness" value={mat.roughness.toFixed(2)} />
                  <DetailRow label="Opacity" value={mat.opacity.toFixed(2)} />
                  <DetailRow label="Transparent" value={mat.transparent ? 'Yes' : 'No'} />
                </div>

                {mat.meshNames.length > 0 && (
                  <div className="mat-meshes">
                    <span className="meshes-label">Used by:</span>
                    <div className="mesh-tags">
                      {mat.meshNames.map((name, j) => (
                        <span key={j} className="mesh-tag">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value, children }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <div className="detail-value">
        {children}
        <span>{value}</span>
      </div>
    </div>
  );
}
