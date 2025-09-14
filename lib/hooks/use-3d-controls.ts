import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Camera3DPosition {
  x: number;
  y: number;
  z: number;
  target?: { x: number; y: number; z: number };
}

interface Use3DControlsOptions {
  onPositionChange?: (position: Camera3DPosition) => void;
}

export function use3DControls({ onPositionChange }: Use3DControlsOptions = {}) {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    currentModel: THREE.Object3D | null;
  } | null>(null);

  const logCurrentPositions = useCallback(() => {
    if (!sceneRef.current) return;

    const { camera, controls, currentModel } = sceneRef.current;
    
    console.log('=== Current 3D Scene State ===');
    console.log(`Camera Position: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`);
    console.log(`Camera Target: x=${controls.target.x.toFixed(2)}, y=${controls.target.y.toFixed(2)}, z=${controls.target.z.toFixed(2)}`);
    
    if (currentModel && !currentModel.userData.isDefault) {
      console.log(`Model Position: x=${currentModel.position.x.toFixed(2)}, y=${currentModel.position.y.toFixed(2)}, z=${currentModel.position.z.toFixed(2)}`);
      console.log(`Model Rotation: x=${currentModel.rotation.x.toFixed(2)}, y=${currentModel.rotation.y.toFixed(2)}, z=${currentModel.rotation.z.toFixed(2)}`);
      console.log(`Model Scale: x=${currentModel.scale.x.toFixed(2)}, y=${currentModel.scale.y.toFixed(2)}, z=${currentModel.scale.z.toFixed(2)}`);
      
      // Get bounding box info
      const box = new THREE.Box3().setFromObject(currentModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      console.log(`Model Bounding Box Center: x=${center.x.toFixed(2)}, y=${center.y.toFixed(2)}, z=${center.z.toFixed(2)}`);
      console.log(`Model Bounding Box Size: x=${size.x.toFixed(2)}, y=${size.y.toFixed(2)}, z=${size.z.toFixed(2)}`);
    }
    
    console.log('==============================');
  }, []);

  const getCurrentState = useCallback(() => {
    if (!sceneRef.current) return null;

    const { camera, controls, currentModel } = sceneRef.current;
    
    const state = {
      camera: {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
      },
      model: currentModel && !currentModel.userData.isDefault ? {
        position: { x: currentModel.position.x, y: currentModel.position.y, z: currentModel.position.z },
        rotation: { x: currentModel.rotation.x, y: currentModel.rotation.y, z: currentModel.rotation.z },
        scale: { x: currentModel.scale.x, y: currentModel.scale.y, z: currentModel.scale.z }
      } : null
    };

    return state;
  }, []);

  const moveCameraTo = useCallback((position: Camera3DPosition) => {
    if (!sceneRef.current) return;

    const { camera, controls } = sceneRef.current;
    
    // Update camera position
    camera.position.set(position.x, position.y, position.z);
    
    // Update target if provided
    if (position.target) {
      controls.target.set(position.target.x, position.target.y, position.target.z);
    }
    
    controls.update();
    logCurrentPositions();
    
    // Notify about position change
    onPositionChange?.(position);
  }, [logCurrentPositions, onPositionChange]);

  const setSceneRef = useCallback((scene: any) => {
    sceneRef.current = scene;
    
    // Add change listener to controls for position logging
    if (scene?.controls) {
      scene.controls.addEventListener('change', () => {
        logCurrentPositions();
        
        // Notify about position change
        const currentPos = {
          x: scene.camera.position.x,
          y: scene.camera.position.y,
          z: scene.camera.position.z,
          target: {
            x: scene.controls.target.x,
            y: scene.controls.target.y,
            z: scene.controls.target.z
          }
        };
        onPositionChange?.(currentPos);
      });
    }
  }, [logCurrentPositions, onPositionChange]);

  return {
    setSceneRef,
    logCurrentPositions,
    getCurrentState,
    moveCameraTo,
    sceneRef
  };
}
