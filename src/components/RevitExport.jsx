import { useState, useCallback } from 'react';
import { downloadOBJ, downloadRevitConfig } from '../utils/exporters';
import './RevitExport.css';

const REVIT_CATEGORIES = [
  'Generic Models', 'Furniture', 'Specialty Equipment', 'Planting', 'Site',
  'Entourage', 'Mass', 'Mechanical Equipment', 'Electrical Equipment',
  'Plumbing Fixtures', 'Lighting Fixtures', 'Casework', 'Columns',
];

const UNITS = ['millimeters', 'centimeters', 'meters', 'inches', 'feet'];

export default function RevitExport({ layers, modelUrl }) {
  const [config, setConfig] = useState({
    familyName: 'TripoAI_Model',
    category: 'Generic Models',
    units: 'millimeters',
    scaleFactor: 1.0,
    filename: 'model_layered',
    materialMapping: {},
  });

  const update = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMapping = useCallback((layerIndex, revitName) => {
    setConfig((prev) => ({
      ...prev,
      materialMapping: { ...prev.materialMapping, [layerIndex]: revitName },
    }));
  }, []);

  const hasLayers = layers && layers.length > 0;

  const handleDownloadOBJ = useCallback(() => {
    if (!hasLayers) return;
    downloadOBJ(layers, config.filename);
  }, [layers, config.filename, hasLayers]);

  const handleDownloadConfig = useCallback(() => {
    if (!hasLayers) return;
    downloadRevitConfig(layers, config);
  }, [layers, config, hasLayers]);

  const handleDownloadAll = useCallback(() => {
    if (!hasLayers) return;
    downloadOBJ(layers, config.filename);
    setTimeout(() => downloadRevitConfig(layers, config), 300);
  }, [layers, config, hasLayers]);

  return (
    <div className="revit-export">
      <div className="revit-header">
        <div className="revit-title-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h3>Export for Revit</h3>
        </div>
        <span className="revit-subtitle">Download layered OBJ with material groups for Revit import</span>
      </div>

      <div className="revit-body">
        {/* Family Settings */}
        <fieldset className="revit-group">
          <legend>Settings</legend>
          <div className="field">
            <label>Family Name</label>
            <input type="text" value={config.familyName} onChange={(e) => update('familyName', e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select value={config.category} onChange={(e) => update('category', e.target.value)}>
                {REVIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Units</label>
              <select value={config.units} onChange={(e) => update('units', e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Scale Factor</label>
              <input type="number" min="0.001" step="0.1" value={config.scaleFactor}
                onChange={(e) => update('scaleFactor', parseFloat(e.target.value) || 1)} />
            </div>
            <div className="field">
              <label>Filename</label>
              <input type="text" value={config.filename} onChange={(e) => update('filename', e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Layer → Revit Material Mapping */}
        {hasLayers && (
          <fieldset className="revit-group">
            <legend>Layer to Revit Material</legend>
            <p className="group-hint">Map each Material ID layer to a Revit material name</p>
            <div className="mapping-list">
              {layers.map((layer) => (
                <div key={layer.index} className="mapping-row">
                  <div className="mapping-source">
                    <div className="mapping-swatch" style={{ background: layer.color }} />
                    <span>{layer.name}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="mapping-arrow">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                  <input
                    type="text"
                    className="mapping-input"
                    placeholder={layer.name}
                    value={config.materialMapping[layer.index] || ''}
                    onChange={(e) => updateMapping(layer.index, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {/* Export Buttons */}
        <div className="export-buttons">
          <button className="revit-export-btn" onClick={handleDownloadAll} disabled={!hasLayers}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download All (OBJ + Config)
          </button>
          <div className="export-row">
            <button className="revit-export-btn secondary" onClick={handleDownloadOBJ} disabled={!hasLayers}>
              OBJ + MTL
            </button>
            <button className="revit-export-btn secondary" onClick={handleDownloadConfig} disabled={!hasLayers}>
              Revit Config JSON
            </button>
          </div>
        </div>

        {!hasLayers && (
          <p className="export-hint">Generate and segment a 3D model to enable export.</p>
        )}

        {hasLayers && (
          <div className="import-steps">
            <p className="steps-title">Revit Import Steps:</p>
            <ol>
              <li>Open Revit Family Editor</li>
              <li>Insert &rarr; Import CAD &rarr; select the <code>.obj</code> file</li>
              <li>Each Material ID layer appears as a named group</li>
              <li>Assign Revit materials using the config JSON</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
