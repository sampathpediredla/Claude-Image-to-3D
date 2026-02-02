import * as THREE from 'three';

/**
 * Segments a Three.js model into layers based on a Material ID lookup.
 *
 * Strategy: For each triangle face in every mesh, project its centroid
 * from the front camera view onto the Material ID image and sample the
 * color to determine which layer it belongs to.
 *
 * Returns an array of layer objects: { index, color, name, mesh }.
 */
export function segmentModel(model, materialIdLookup) {
  // Collect all mesh geometries from the model
  const meshes = [];
  model.traverse((child) => {
    if (child.isMesh && child.geometry) {
      meshes.push(child);
    }
  });

  if (meshes.length === 0) return [];

  // Compute model bounding box for camera setup
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Set up an orthographic camera looking at the model from the front (–Z)
  // This matches a typical front-view photo perspective
  const aspect = materialIdLookup.width / materialIdLookup.height;
  const halfH = maxDim * 0.6;
  const halfW = halfH * aspect;
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, maxDim * 10);
  camera.position.set(center.x, center.y, center.z + maxDim * 2);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  const layerCount = materialIdLookup.layers.length;
  // For each layer, accumulate positions and normals
  const layerGeoms = Array.from({ length: layerCount }, () => ({
    positions: [],
    normals: [],
    uvs: [],
  }));

  const _v = new THREE.Vector3();
  const _projected = new THREE.Vector3();

  for (const mesh of meshes) {
    const geom = mesh.geometry;
    const posAttr = geom.getAttribute('position');
    const normAttr = geom.getAttribute('normal');
    const uvAttr = geom.getAttribute('uv');
    if (!posAttr) continue;

    // Get world matrix to transform vertices
    mesh.updateWorldMatrix(true, false);
    const worldMatrix = mesh.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(worldMatrix);

    const index = geom.index;
    const faceCount = index ? index.count / 3 : posAttr.count / 3;

    for (let f = 0; f < faceCount; f++) {
      const i0 = index ? index.getX(f * 3) : f * 3;
      const i1 = index ? index.getX(f * 3 + 1) : f * 3 + 1;
      const i2 = index ? index.getX(f * 3 + 2) : f * 3 + 2;

      // Compute face centroid in world space
      const cx = (posAttr.getX(i0) + posAttr.getX(i1) + posAttr.getX(i2)) / 3;
      const cy = (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3;
      const cz = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3;
      _v.set(cx, cy, cz).applyMatrix4(worldMatrix);

      // Project centroid to camera screen space → NDC (-1..1)
      _projected.copy(_v).project(camera);

      // NDC to pixel coordinates in the Material ID image
      const px = (_projected.x * 0.5 + 0.5) * materialIdLookup.width;
      const py = (1 - (_projected.y * 0.5 + 0.5)) * materialIdLookup.height;

      const layerIdx = materialIdLookup.sampleAtPixel(px, py);

      // Copy the three vertices into the layer geometry
      for (const vi of [i0, i1, i2]) {
        _v.set(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi)).applyMatrix4(worldMatrix);
        layerGeoms[layerIdx].positions.push(_v.x, _v.y, _v.z);

        if (normAttr) {
          _v.set(normAttr.getX(vi), normAttr.getY(vi), normAttr.getZ(vi)).applyNormalMatrix(normalMatrix);
          layerGeoms[layerIdx].normals.push(_v.x, _v.y, _v.z);
        }

        if (uvAttr) {
          layerGeoms[layerIdx].uvs.push(uvAttr.getX(vi), uvAttr.getY(vi));
        }
      }
    }
  }

  // Build layer meshes
  const layers = [];
  for (let i = 0; i < layerCount; i++) {
    const ld = layerGeoms[i];
    if (ld.positions.length === 0) continue;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(ld.positions, 3));
    if (ld.normals.length > 0) {
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(ld.normals, 3));
    }
    if (ld.uvs.length > 0) {
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(ld.uvs, 2));
    }

    const layerInfo = materialIdLookup.layers[i];
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(layerInfo.r / 255, layerInfo.g / 255, layerInfo.b / 255),
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, material);
    mesh.name = layerInfo.name;

    layers.push({
      index: i,
      color: layerInfo.color,
      name: layerInfo.name,
      percentage: layerInfo.percentage,
      faceCount: ld.positions.length / 9, // 3 vertices * 3 components = 9 floats per face
      mesh,
      visible: true,
    });
  }

  return layers;
}
