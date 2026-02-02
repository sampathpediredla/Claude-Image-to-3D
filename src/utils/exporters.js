import * as THREE from 'three';

/**
 * Export segmented layers as OBJ + MTL files (zipped or separate).
 * Each layer becomes a named group "g Layer_N" with its own material.
 * This format preserves layer separation when imported into Revit.
 */
export function exportLayeredOBJ(layers, filename = 'model') {
  let objContent = `# Layered OBJ exported from Image-to-3D\n`;
  objContent += `# ${layers.length} layers based on Material ID segmentation\n`;
  objContent += `mtllib ${filename}.mtl\n\n`;

  let mtlContent = `# Material definitions for Material ID layers\n\n`;

  let vertexOffset = 0;

  for (const layer of layers) {
    if (!layer.mesh || !layer.mesh.geometry) continue;

    const geom = layer.mesh.geometry;
    const posAttr = geom.getAttribute('position');
    const normAttr = geom.getAttribute('normal');
    if (!posAttr) continue;

    const matName = sanitizeName(layer.name);

    // MTL entry
    const r = parseInt(layer.color.slice(1, 3), 16) / 255;
    const g = parseInt(layer.color.slice(3, 5), 16) / 255;
    const b = parseInt(layer.color.slice(5, 7), 16) / 255;

    mtlContent += `newmtl ${matName}\n`;
    mtlContent += `Kd ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}\n`;
    mtlContent += `Ka 0.1000 0.1000 0.1000\n`;
    mtlContent += `Ks 0.3000 0.3000 0.3000\n`;
    mtlContent += `Ns 50.0000\n`;
    mtlContent += `d 1.0000\n`;
    mtlContent += `illum 2\n\n`;

    // OBJ group
    objContent += `g ${matName}\n`;
    objContent += `usemtl ${matName}\n`;

    const vertCount = posAttr.count;

    // Vertices
    for (let i = 0; i < vertCount; i++) {
      objContent += `v ${posAttr.getX(i).toFixed(6)} ${posAttr.getY(i).toFixed(6)} ${posAttr.getZ(i).toFixed(6)}\n`;
    }

    // Normals
    if (normAttr) {
      for (let i = 0; i < normAttr.count; i++) {
        objContent += `vn ${normAttr.getX(i).toFixed(6)} ${normAttr.getY(i).toFixed(6)} ${normAttr.getZ(i).toFixed(6)}\n`;
      }
    }

    // Faces (triangles)
    const faceCount = vertCount / 3;
    for (let f = 0; f < faceCount; f++) {
      const a = vertexOffset + f * 3 + 1; // OBJ indices are 1-based
      const b = vertexOffset + f * 3 + 2;
      const c = vertexOffset + f * 3 + 3;
      if (normAttr) {
        objContent += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        objContent += `f ${a} ${b} ${c}\n`;
      }
    }

    objContent += '\n';
    vertexOffset += vertCount;
  }

  return { obj: objContent, mtl: mtlContent };
}

/**
 * Download OBJ + MTL as separate files.
 */
export function downloadOBJ(layers, filename = 'model_layered') {
  const { obj, mtl } = exportLayeredOBJ(layers, filename);

  downloadBlob(obj, `${filename}.obj`, 'text/plain');
  downloadBlob(mtl, `${filename}.mtl`, 'text/plain');
}

/**
 * Export Revit import configuration JSON.
 */
export function exportRevitConfig(layers, config = {}) {
  const exportData = {
    revitImportConfig: {
      familyName: config.familyName || 'TripoAI_Model',
      category: config.category || 'Generic Models',
      sourceFile: `${config.filename || 'model_layered'}.obj`,
      materialLibrary: `${config.filename || 'model_layered'}.mtl`,
      units: config.units || 'millimeters',
      scaleFactor: config.scaleFactor || 1.0,
      layers: layers.map((layer) => ({
        name: layer.name,
        color: layer.color,
        faceCount: layer.faceCount,
        coverage: layer.percentage + '%',
        revitSubcategory: config.layerMapping?.[layer.index] || layer.name,
        revitMaterial: config.materialMapping?.[layer.index] || layer.name,
      })),
      importInstructions: [
        '1. Open Revit Family Editor or project',
        '2. Go to Insert > Import CAD or use ShapeImporter for OBJ',
        '3. Select the .obj file — layers will appear as named groups',
        '4. Each group corresponds to a Material ID layer',
        '5. Assign Revit materials to each group using this configuration',
        '6. Set proper scale factor if model units differ from project units',
      ],
    },
    metadata: {
      generatedBy: 'Image-to-3D (Tripo AI + Material ID Segmentation)',
      exportDate: new Date().toISOString(),
      layerCount: layers.length,
      totalFaces: layers.reduce((sum, l) => sum + l.faceCount, 0),
    },
  };

  return exportData;
}

export function downloadRevitConfig(layers, config = {}) {
  const data = exportRevitConfig(layers, config);
  const filename = config.filename || 'model_layered';
  downloadBlob(
    JSON.stringify(data, null, 2),
    `${filename}_revit_config.json`,
    'application/json'
  );
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}
