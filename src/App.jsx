import { useState, useCallback, useEffect, useRef } from 'react';
import ImageUploader from './components/ImageUploader';
import ModelViewer from './components/ModelViewer';
import MaterialPanel from './components/MaterialPanel';
import RevitExport from './components/RevitExport';
import StatusBar from './components/StatusBar';
import { useTripoGeneration } from './hooks/useTripoGeneration';
import { checkHealth } from './services/tripoApi';
import { loadImage, createMaterialIdLookup } from './utils/materialIdParser';
import { segmentModel } from './utils/modelSegmenter';
import './App.css';

export default function App() {
  const [objectImage, setObjectImage] = useState(null);
  const [materialIdImage, setMaterialIdImage] = useState(null);
  const [apiReady, setApiReady] = useState(null);
  const [layers, setLayers] = useState([]);
  const [segmenting, setSegmenting] = useState(false);
  const [activeTab, setActiveTab] = useState('viewer');

  const gen = useTripoGeneration();
  const loadedModelRef = useRef(null);
  const materialIdFileRef = useRef(null);

  useEffect(() => {
    checkHealth()
      .then((data) => setApiReady(data.apiKeyConfigured))
      .catch(() => setApiReady(false));
  }, []);

  const isProcessing =
    gen.status !== 'idle' && gen.status !== 'success' && gen.status !== 'error';

  // When the GLB finishes loading, run Material ID segmentation if we have both
  const handleModelLoaded = useCallback(async (model) => {
    loadedModelRef.current = model;

    if (materialIdFileRef.current) {
      await runSegmentation(model, materialIdFileRef.current);
    }
  }, []);

  // Run segmentation: project Material ID image onto the 3D model
  async function runSegmentation(model, matIdFile) {
    setSegmenting(true);
    try {
      const img = await loadImage(matIdFile);
      const lookup = createMaterialIdLookup(img);
      const result = segmentModel(model, lookup);
      setLayers(result);
    } catch (err) {
      console.error('Segmentation error:', err);
    } finally {
      setSegmenting(false);
    }
  }

  // Generate 3D model from the object photo
  const handleGenerate = useCallback(() => {
    if (!objectImage) return;
    setLayers([]);
    gen.generateSingle(objectImage);
  }, [objectImage, gen]);

  const handleReset = useCallback(() => {
    gen.reset();
    setObjectImage(null);
    setMaterialIdImage(null);
    setLayers([]);
    loadedModelRef.current = null;
    materialIdFileRef.current = null;
  }, [gen]);

  // Track the Material ID file so we can use it when the model loads
  const handleMaterialIdSelect = useCallback((file) => {
    setMaterialIdImage(file);
    materialIdFileRef.current = file;

    // If model is already loaded, re-segment immediately
    if (file && loadedModelRef.current) {
      runSegmentation(loadedModelRef.current, file);
    } else if (!file) {
      setLayers([]);
    }
  }, []);

  // Toggle layer visibility in the 3D viewer
  const handleToggleLayer = useCallback((layerIndex) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.index === layerIndex) {
          const newVisible = !l.visible;
          if (l.mesh) l.mesh.visible = newVisible;
          return { ...l, visible: newVisible };
        }
        return l;
      })
    );
  }, []);

  // Rename a layer
  const handleRenameLayer = useCallback((layerIndex, newName) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.index === layerIndex ? { ...l, name: newName } : l
      )
    );
  }, []);

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
          <h2>Upload Images</h2>
          <p className="mode-description">
            Upload a photo of the object and a Material ID image. The Material ID colors are used to
            split the generated 3D model into separate layers for Revit import.
          </p>

          <div className="uploaders">
            <ImageUploader
              label="Object Photo"
              hint="Regular photo of the object to generate 3D model from"
              onImageSelect={setObjectImage}
              disabled={isProcessing}
            />
            <ImageUploader
              label="Material ID"
              hint="Color-coded image where each flat color = a separate layer"
              onImageSelect={handleMaterialIdSelect}
              disabled={isProcessing}
            />
          </div>

          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={!objectImage || isProcessing || apiReady === false}
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

        {/* Status */}
        {gen.status !== 'idle' && (
          <StatusBar status={gen.status} progress={gen.progress} error={gen.error} />
        )}

        {segmenting && (
          <div className="segmenting-bar">
            <span className="spinner small" /> Segmenting model by Material ID colors...
          </div>
        )}

        {/* Workspace */}
        <section className="workspace-section">
          <h2>3D Workspace</h2>

          <div className="workspace-tabs">
            <button className={`tab-btn ${activeTab === 'viewer' ? 'active' : ''}`}
              onClick={() => setActiveTab('viewer')}>Viewport</button>
            <button className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}>Layers</button>
            <button className={`tab-btn ${activeTab === 'revit' ? 'active' : ''}`}
              onClick={() => setActiveTab('revit')}>Export</button>
          </div>

          <div className="workspace-layout">
            <div className={`workspace-viewport ${activeTab === 'viewer' ? 'tab-active' : ''}`}>
              <div className="viewport-card">
                <div className="viewer-wrapper">
                  <ModelViewer
                    modelUrl={gen.modelUrl}
                    layers={layers}
                    onModelLoaded={handleModelLoaded}
                  />
                </div>
              </div>
            </div>

            <div className="workspace-sidebar">
              <div className={`sidebar-panel ${activeTab === 'materials' ? 'tab-active' : ''}`}>
                <MaterialPanel
                  layers={layers}
                  onToggleLayer={handleToggleLayer}
                  onRenameLayer={handleRenameLayer}
                />
              </div>
              <div className={`sidebar-panel ${activeTab === 'revit' ? 'tab-active' : ''}`}>
                <RevitExport layers={layers} modelUrl={gen.modelUrl} />
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
