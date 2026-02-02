import { useState, useCallback } from 'react';
import './RevitExport.css';

const REVIT_CATEGORIES = [
  'Generic Models',
  'Furniture',
  'Specialty Equipment',
  'Planting',
  'Site',
  'Entourage',
  'Mass',
  'Mechanical Equipment',
  'Electrical Equipment',
  'Plumbing Fixtures',
  'Lighting Fixtures',
  'Casework',
  'Columns',
  'Structural Framing',
];

const UNITS = ['millimeters', 'centimeters', 'meters', 'inches', 'feet'];

const DETAIL_LEVELS = ['Coarse', 'Medium', 'Fine'];

export default function RevitExport({ materials, modelUrl }) {
  const [config, setConfig] = useState({
    familyName: 'TripoAI_Model',
    category: 'Generic Models',
    units: 'millimeters',
    scaleFactor: 1.0,
    detailLevel: 'Fine',
    createSubcategories: true,
    materialMapping: {},
    insertionPoint: { x: 0, y: 0, z: 0 },
    enableCollision: true,
    alwaysVertical: false,
    cutWithVoids: false,
    shared: false,
    exportFormat: 'glb',
  });

  const updateConfig = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateInsertionPoint = useCallback((axis, value) => {
    setConfig((prev) => ({
      ...prev,
      insertionPoint: { ...prev.insertionPoint, [axis]: parseFloat(value) || 0 },
    }));
  }, []);

  const updateMaterialMapping = useCallback((matId, revitMaterial) => {
    setConfig((prev) => ({
      ...prev,
      materialMapping: { ...prev.materialMapping, [matId]: revitMaterial },
    }));
  }, []);

  const exportConfig = useCallback(() => {
    const exportData = {
      revitFamilyConfig: {
        familyName: config.familyName,
        category: config.category,
        sourceFile: modelUrl || 'model.glb',
        exportFormat: config.exportFormat,
        units: config.units,
        scaleFactor: config.scaleFactor,
        detailLevel: config.detailLevel,
        insertionPoint: config.insertionPoint,
        parameters: {
          enableCollision: config.enableCollision,
          alwaysVertical: config.alwaysVertical,
          cutWithVoids: config.cutWithVoids,
          shared: config.shared,
          createSubcategories: config.createSubcategories,
        },
        materials: (materials || []).map((mat) => ({
          originalName: mat.name,
          color: mat.color,
          metalness: mat.metalness,
          roughness: mat.roughness,
          opacity: mat.opacity,
          revitMaterial: config.materialMapping[mat.id] || mat.name,
          meshes: mat.meshNames,
        })),
      },
      metadata: {
        generatedBy: 'Image-to-3D Tripo AI',
        exportDate: new Date().toISOString(),
        version: '1.0',
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.familyName}_revit_config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config, materials, modelUrl]);

  const hasModel = !!modelUrl;

  return (
    <div className="revit-export">
      <div className="revit-header">
        <div className="revit-title-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3>Revit Export Configuration</h3>
        </div>
        <span className="revit-subtitle">Configure settings for importing into Autodesk Revit</span>
      </div>

      <div className="revit-body">
        {/* Family Settings */}
        <fieldset className="revit-group">
          <legend>Family Settings</legend>
          <div className="field">
            <label>Family Name</label>
            <input
              type="text"
              value={config.familyName}
              onChange={(e) => updateConfig('familyName', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={config.category} onChange={(e) => updateConfig('category', e.target.value)}>
              {REVIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Detail Level</label>
              <select value={config.detailLevel} onChange={(e) => updateConfig('detailLevel', e.target.value)}>
                {DETAIL_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Export Format</label>
              <select value={config.exportFormat} onChange={(e) => updateConfig('exportFormat', e.target.value)}>
                <option value="glb">GLB (Binary glTF)</option>
                <option value="fbx">FBX (via converter)</option>
                <option value="obj">OBJ (via converter)</option>
                <option value="sat">SAT (ACIS solid)</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Units and Scale */}
        <fieldset className="revit-group">
          <legend>Units &amp; Scale</legend>
          <div className="field-row">
            <div className="field">
              <label>Units</label>
              <select value={config.units} onChange={(e) => updateConfig('units', e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Scale Factor</label>
              <input
                type="number"
                min="0.001"
                step="0.1"
                value={config.scaleFactor}
                onChange={(e) => updateConfig('scaleFactor', parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>
        </fieldset>

        {/* Insertion Point */}
        <fieldset className="revit-group">
          <legend>Insertion Point</legend>
          <div className="field-row triple">
            {['x', 'y', 'z'].map((axis) => (
              <div className="field" key={axis}>
                <label>{axis.toUpperCase()}</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.insertionPoint[axis]}
                  onChange={(e) => updateInsertionPoint(axis, e.target.value)}
                />
              </div>
            ))}
          </div>
        </fieldset>

        {/* Parameters */}
        <fieldset className="revit-group">
          <legend>Parameters</legend>
          <div className="toggle-list">
            <ToggleField label="Enable collision" checked={config.enableCollision}
              onChange={(v) => updateConfig('enableCollision', v)} />
            <ToggleField label="Always vertical" checked={config.alwaysVertical}
              onChange={(v) => updateConfig('alwaysVertical', v)} />
            <ToggleField label="Cut with voids" checked={config.cutWithVoids}
              onChange={(v) => updateConfig('cutWithVoids', v)} />
            <ToggleField label="Shared family" checked={config.shared}
              onChange={(v) => updateConfig('shared', v)} />
            <ToggleField label="Create subcategories per material" checked={config.createSubcategories}
              onChange={(v) => updateConfig('createSubcategories', v)} />
          </div>
        </fieldset>

        {/* Material Mapping */}
        {materials && materials.length > 0 && (
          <fieldset className="revit-group">
            <legend>Material Mapping</legend>
            <p className="group-hint">Map GLB materials to Revit material names</p>
            <div className="mapping-list">
              {materials.map((mat) => (
                <div key={mat.id} className="mapping-row">
                  <div className="mapping-source">
                    <div className="mapping-swatch" style={{ background: mat.color }} />
                    <span>{mat.name}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="mapping-arrow">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                  <input
                    type="text"
                    className="mapping-input"
                    placeholder={mat.name}
                    value={config.materialMapping[mat.id] || ''}
                    onChange={(e) => updateMaterialMapping(mat.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {/* Export Button */}
        <button className="revit-export-btn" onClick={exportConfig} disabled={!hasModel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Revit Configuration
        </button>
        {!hasModel && (
          <p className="export-hint">Generate a 3D model first to export configuration.</p>
        )}
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="toggle-field">
      <span>{label}</span>
      <button
        type="button"
        className={`toggle-switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className="toggle-knob" />
      </button>
    </label>
  );
}
