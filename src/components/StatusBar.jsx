import './StatusBar.css';

const STATUS_CONFIG = {
  idle: { label: 'Ready', color: 'gray' },
  uploading: { label: 'Uploading images...', color: 'blue' },
  generating: { label: 'Starting 3D generation...', color: 'blue' },
  polling: { label: 'Generating 3D model...', color: 'orange' },
  success: { label: 'Model generated!', color: 'green' },
  error: { label: 'Error', color: 'red' },
};

export default function StatusBar({ status, progress, error }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div className={`status-bar status-${config.color}`}>
      <div className="status-top">
        <div className="status-indicator">
          <span className={`status-dot ${config.color}`} />
          <span className="status-label">{config.label}</span>
        </div>
        {status !== 'idle' && status !== 'success' && status !== 'error' && (
          <span className="status-progress">{Math.round(progress)}%</span>
        )}
      </div>

      {status !== 'idle' && (
        <div className="progress-track">
          <div
            className={`progress-fill ${config.color}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {error && <p className="status-error">{error}</p>}
    </div>
  );
}
