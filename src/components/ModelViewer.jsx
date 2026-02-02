import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './ModelViewer.css';

export default function ModelViewer({ modelUrl, onMaterialsExtracted }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const modelRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const cleanupScene = useCallback(() => {
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      modelRef.current = null;
    }
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12141e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 1000);
    camera.position.set(2, 1.5, 2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.minDistance = 0.5;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 8, 5);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.4);
    dirLight2.position.set(-3, 4, -3);
    scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Grid helper
    const grid = new THREE.GridHelper(6, 24, 0x2a2d3e, 0x1e2030);
    scene.add(grid);

    // Animation loop
    function animate() {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load model when URL changes
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;

    cleanupScene();
    setLoading(true);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Compute bounding box and center/scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y -= (box.min.y * scale);

        sceneRef.current.add(model);
        modelRef.current = model;

        // Reset camera
        if (controlsRef.current && cameraRef.current) {
          controlsRef.current.target.set(0, size.y * scale * 0.4, 0);
          cameraRef.current.position.set(2, 1.5, 2);
          controlsRef.current.update();
        }

        // Extract materials
        const materials = extractMaterials(model);
        if (onMaterialsExtracted) {
          onMaterialsExtracted(materials);
        }

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('GLB load error:', err);
        setLoading(false);
      }
    );
  }, [modelUrl, cleanupScene, onMaterialsExtracted]);

  if (!modelUrl) {
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
      {loading && (
        <div className="viewer-loading">
          <div className="viewer-spinner" />
          <span>Loading 3D model...</span>
        </div>
      )}
      <div className="viewer-controls-hint">
        Drag to orbit &middot; Scroll to zoom &middot; Right-click to pan
      </div>
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
        GLB
      </a>
    </div>
  );
}

function extractMaterials(model) {
  const materialsMap = new Map();

  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (materialsMap.has(mat.uuid)) return;

      const color = mat.color ? '#' + mat.color.getHexString() : '#cccccc';
      const emissive = mat.emissive ? '#' + mat.emissive.getHexString() : '#000000';

      materialsMap.set(mat.uuid, {
        id: mat.uuid,
        name: mat.name || `Material_${materialsMap.size}`,
        color,
        emissive,
        metalness: mat.metalness ?? 0,
        roughness: mat.roughness ?? 1,
        opacity: mat.opacity ?? 1,
        transparent: mat.transparent || false,
        type: mat.type,
        meshNames: [],
      });
    });

    // Track which meshes use this material
    const matList = Array.isArray(child.material) ? child.material : [child.material];
    matList.forEach((mat) => {
      const entry = materialsMap.get(mat.uuid);
      if (entry) {
        entry.meshNames.push(child.name || 'unnamed');
      }
    });
  });

  return Array.from(materialsMap.values());
}
