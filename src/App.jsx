import { useState, useCallback, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import ModelViewer from './components/ModelViewer';
import MaterialPanel from './components/MaterialPanel';
import RevitExport from './components/RevitExport';
import StatusBar from './components/StatusBar';
import { useTripoGeneration } from './hooks/useTripoGeneration';
import { checkHealth } from './services/tripoApi';
import './App.css';

export default function App() {
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [mode, setMode] = useState('single');
  const [apiReady, setApiReady] = useState(null);
  const [materials1, setMaterials1] = useState([]);
  const [materials2, setMaterials2] = useState([]);
  const [materialsMV, setMaterialsMV] = useState([]);
  const [activeTab, setActiveTab] = useState('viewer');

  const gen1 = useTripoGeneration();
  const gen2 = useTripoGeneration();
  const genMultiview = useTripoGeneration();

  useEffect(() => {
    checkHealth()
      .then((data) => setApiReady(data.apiKeyConfigured))
      .catch(() => setApiReady(false));
  }, []);

  const isProcessing =
    gen1.status !== 'idle' && gen1.status !== 'success' && gen1.status !== 'error' ||
    gen2.status !== 'idle' && gen2.status !== 'success' && gen2.status !== 'error' ||
    genMultiview.status !== 'idle' && genMultiview.status !== 'success' && genMultiview.status !== 'error';

  const handleGenerate = useCallback(() => {
    if (mode === 'single') {
      if (image1) gen1.generateSingle(image1);
      if (image2) gen2.generateSingle(image2);
    } else {
      if (image1 && image2) {
        genMultiview.generateMultiview([image1, image2]);
      }
    }
  }, [mode, image1, image2, gen1, gen2, genMultiview]);

  const handleReset = useCallback(() => {
    gen1.reset();
    gen2.reset();
    genMultiview.reset();
    setImage1(null);
    setImage2(null);
    setMaterials1([]);
    setMaterials2([]);
    setMaterialsMV([]);
  }, [gen1, gen2, genMultiview]);

  const canGenerate =
    mode === 'single'
      ? (image1 || image2) && !isProcessing
      : image1 && image2 && !isProcessing;

  // Determine the active model URL and materials for the side panels
  const activeModelUrl = mode === 'multiview' ? genMultiview.modelUrl : (gen1.modelUrl || gen2.modelUrl);
  const activeMaterials = mode === 'multiview' ? materialsMV : (materials1.length ? materials1 : materials2);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <h1>Image to 3D</h1>
          </div>
          <span className="powered-by">Powered by Tripo AI</span>
        </div>
      </header>

      {apiReady === false && (
        <div className="api-warning">
          <strong>API Key Required:</strong> Copy <code>.env.example</code> to{' '}
          <code>.env</code> and add your Tripo API key. Get a free key at{' '}
          <a href="https://platform.tripo3d.ai/api-keys" target="_blank" rel="noopener noreferrer">
            platform.tripo3d.ai/api-keys
          </a>
        </div>
      )}

      <main className="app-main">
        {/* Upload Section */}
        <section className="upload-section">
          <div className="section-header">
            <h2>Upload Images</h2>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
                onClick={() => setMode('single')}
                disabled={isProcessing}
              >
                Individual
              </button>
              <button
                className={`mode-btn ${mode === 'multiview' ? 'active' : ''}`}
                onClick={() => setMode('multiview')}
                disabled={isProcessing}
              >
                Multiview
              </button>
            </div>
          </div>

          <p className="mode-description">
            {mode === 'single'
              ? 'Generate a separate 3D model from each image independently.'
              : 'Combine both images as multiple views to generate one higher-quality 3D model.'}
          </p>

          <div className="uploaders">
            <ImageUploader label="Image 1" onImageSelect={setImage1} disabled={isProcessing} />
            <ImageUploader label="Image 2" onImageSelect={setImage2} disabled={isProcessing} />
          </div>

          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={!canGenerate || apiReady === false}
            >
              {isProcessing ? (
                <>
                  <span className="spinner" />
                  Generating...
                </>
              ) : (
                'Generate 3D Model'
              )}
            </button>
            <button className="btn btn-secondary" onClick={handleReset} disabled={isProcessing}>
              Reset
            </button>
          </div>
        </section>

        {/* Viewport + Side Panels */}
        <section className="workspace-section">
          <h2>3D Workspace</h2>

          {/* Tab bar for side panels on smaller screens */}
          <div className="workspace-tabs">
            <button className={`tab-btn ${activeTab === 'viewer' ? 'active' : ''}`}
              onClick={() => setActiveTab('viewer')}>Viewport</button>
            <button className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}>Materials</button>
            <button className={`tab-btn ${activeTab === 'revit' ? 'active' : ''}`}
              onClick={() => setActiveTab('revit')}>Revit Export</button>
          </div>

          <div className="workspace-layout">
            {/* 3D Viewport */}
            <div className={`workspace-viewport ${activeTab === 'viewer' ? 'tab-active' : ''}`}>
              {mode === 'single' ? (
                <div className="viewport-stack">
                  <div className="viewport-card">
                    <div className="viewport-label">Model from Image 1</div>
                    {gen1.status !== 'idle' && (
                      <StatusBar status={gen1.status} progress={gen1.progress} error={gen1.error} />
                    )}
                    <div className="viewer-wrapper">
                      <ModelViewer modelUrl={gen1.modelUrl} onMaterialsExtracted={setMaterials1} />
                    </div>
                  </div>
                  {image2 && (
                    <div className="viewport-card">
                      <div className="viewport-label">Model from Image 2</div>
                      {gen2.status !== 'idle' && (
                        <StatusBar status={gen2.status} progress={gen2.progress} error={gen2.error} />
                      )}
                      <div className="viewer-wrapper">
                        <ModelViewer modelUrl={gen2.modelUrl} onMaterialsExtracted={setMaterials2} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="viewport-card">
                  <div className="viewport-label">Multiview 3D Model</div>
                  {genMultiview.status !== 'idle' && (
                    <StatusBar
                      status={genMultiview.status}
                      progress={genMultiview.progress}
                      error={genMultiview.error}
                    />
                  )}
                  <div className="viewer-wrapper">
                    <ModelViewer modelUrl={genMultiview.modelUrl} onMaterialsExtracted={setMaterialsMV} />
                  </div>
                </div>
              )}
            </div>

            {/* Side Panels */}
            <div className="workspace-sidebar">
              <div className={`sidebar-panel ${activeTab === 'materials' ? 'tab-active' : ''}`}>
                <MaterialPanel materials={activeMaterials} />
              </div>
              <div className={`sidebar-panel ${activeTab === 'revit' ? 'tab-active' : ''}`}>
                <RevitExport materials={activeMaterials} modelUrl={activeModelUrl} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Built with React, Three.js &amp; Tripo AI &mdash;{' '}
          <a href="https://platform.tripo3d.ai/api-keys" target="_blank" rel="noopener noreferrer">
            Get a free API key
          </a>
        </p>
      </footer>
    </div>
  );
}
