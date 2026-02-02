import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './ModelViewer.css';

/**
 * Three.js viewport with orbit controls.
 *
 * Props:
 *  - modelUrl: URL to a GLB file
 *  - layers: optional array of segmented layer objects (from modelSegmenter)
 *  - onModelLoaded: callback(model) when GLB finishes loading (before segmentation)
 */
export default function ModelViewer({ modelUrl, layers, onModelLoaded }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  const layerGroupRef = useRef(null);
  const rawModelRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Clean up any model objects from the scene
  const cleanupScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (layerGroupRef.current) {
      scene.remove(layerGroupRef.current);
      layerGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
      layerGroupRef.current = null;
    }

    if (rawModelRef.current) {
      scene.remove(rawModelRef.current);
      rawModelRef.current.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      rawModelRef.current = null;
    }
  }, []);

  // Initialize Three.js scene (runs once)
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const dir1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dir1.position.set(5, 8, 5);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.4);
    dir2.position.set(-3, 4, -3);
    scene.add(dir2);

    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, -2, -5);
    scene.add(rim);

    // Grid
    scene.add(new THREE.GridHelper(6, 24, 0x2a2d3e, 0x1e2030));

    // Render loop
    function animate() {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frameIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load GLB model when modelUrl changes
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;

    cleanupScene();
    setLoading(true);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y -= box.min.y * scale;

        // Store as raw model (will be hidden once layers are applied)
        sceneRef.current.add(model);
        rawModelRef.current = model;

        // Reset camera
        if (controlsRef.current && cameraRef.current) {
          controlsRef.current.target.set(0, size.y * scale * 0.4, 0);
          cameraRef.current.position.set(2, 1.5, 2);
          controlsRef.current.update();
        }

        if (onModelLoaded) {
          onModelLoaded(model);
        }

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('GLB load error:', err);
        setLoading(false);
      }
    );
  }, [modelUrl, cleanupScene, onModelLoaded]);

  // When segmented layers arrive, swap them in and hide the raw model
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !layers || layers.length === 0) return;

    // Hide raw model
    if (rawModelRef.current) {
      rawModelRef.current.visible = false;
    }

    // Remove previous layer group
    if (layerGroupRef.current) {
      scene.remove(layerGroupRef.current);
    }

    const group = new THREE.Group();
    group.name = 'SegmentedLayers';

    // Center the layer meshes the same way as the raw model
    if (rawModelRef.current) {
      group.scale.copy(rawModelRef.current.scale);
      group.position.copy(rawModelRef.current.position);
    }

    for (const layer of layers) {
      if (layer.mesh) {
        layer.mesh.visible = layer.visible !== false;
        group.add(layer.mesh);
      }
    }

    scene.add(group);
    layerGroupRef.current = group;
  }, [layers]);

  // Placeholder when no model
  if (!modelUrl) {
    return (
      <div className="model-viewer-placeholder">
        <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <p>3D viewport</p>
        <span>Upload an object photo and generate to see the model</span>
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
    </div>
  );
}
