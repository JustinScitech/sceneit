'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Product } from '@/lib/shopify/types';
import { cn } from '@/lib/utils';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { useWebSocket } from '@/lib/hooks/use-websocket';
import { use3DControls } from '@/lib/hooks/use-3d-controls';
import { VapiChat } from '@/components/vapi/vapi-chat';
import { useCart } from '@/components/cart/cart-context';
import { initializeWebhookServer } from '@/lib/utils/webhook-init';

interface Product3DViewerProps {
  product: Product;
  className?: string;
  enableWebSocket?: boolean;
}

interface ModelInfo {
  meshes: number;
  materials: number;
  textures: number;
  animations: number;
}

export function Product3DViewer({ product, className, enableWebSocket = false }: Product3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    currentModel: THREE.Object3D | null;
    gltfLoader: GLTFLoader;
    objLoader: OBJLoader;
    mtlLoader: MTLLoader;
    animationId: number | null;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Get cart context for adding items
  const { addItem } = useCart();

  // Initialize 3D controls hook
  const { setSceneRef, moveCameraTo, logCurrentPositions } = use3DControls({
    onPositionChange: (position) => {
      // Optional: Handle position changes
      console.log('Camera position changed:', position);
    }
  });

  
  
  console.log('WebSocket enabled:', enableWebSocket);
  console.log('WebSocket URL:', enableWebSocket ? 'ws://localhost:8081' : 'disabled');
  
  const { isConnected, sendMessage } = useWebSocket({
    url: enableWebSocket ? 'ws://localhost:8081' : '',
    onMessage: (message: any) => {
      console.log('WS-MESSAGE-RECEIVED:', message);
      
      if (message.type === 'cameraCommand' && message.action === 'moveTo') {
        const { x, y, z, target } = message.params;
        console.log('EXECUTING-CAMERA-MOVE:', { x, y, z, target });
        moveCameraTo({ x, y, z, target });
      } else if (message.type === 'addToCart' && message.action === 'addItem') {
        console.log('ADDING-TO-CART:', message);
        
        const globalPurchaseId = message.globalPurchaseId;
        if (!globalPurchaseId) {
          console.log('No globalPurchaseId in message, ignoring');
          return;
        }
        
        // Check if this purchase has already been processed by any client
        const processedPurchasesKey = 'sceneit_processed_purchases';
        const existingProcessed = JSON.parse(localStorage.getItem(processedPurchasesKey) || '{}');
        
        // Clean up old entries (older than 30 seconds)
        const now = Date.now();
        Object.keys(existingProcessed).forEach(key => {
          if (now - existingProcessed[key] > 30000) {
            delete existingProcessed[key];
          }
        });
        
        // Check if this purchase was already processed
        if (existingProcessed[globalPurchaseId]) {
          console.log('Purchase already processed by another client:', globalPurchaseId);
          return;
        }
        
        // Mark this purchase as processed
        existingProcessed[globalPurchaseId] = now;
        localStorage.setItem(processedPurchasesKey, JSON.stringify(existingProcessed));
        
        // Use the cart item from the WebSocket message (contains correct product info)
        const cartItem = message.cartItem;
        if (cartItem && addItem) {
          console.log('Adding product to cart via voice command:', cartItem);
          console.log('Product ID from VAPI:', message.productId);
          console.log('Variant ID from VAPI:', message.variantId);
          
          try {
            // Create a variant-like object from the cart item for addItem function
            const variant = {
              id: cartItem.merchandise.id,
              title: cartItem.merchandise.title,
              availableForSale: true,
              selectedOptions: cartItem.merchandise.selectedOptions || [],
              price: {
                amount: cartItem.cost.totalAmount.amount,
                currencyCode: cartItem.cost.totalAmount.currencyCode
              }
            };
            
            const productData = cartItem.merchandise.product;
            
            console.log('Adding item to cart with variant:', variant);
            console.log('Adding item to cart with product:', productData);
            addItem(variant, productData);
            console.log('addItem called successfully with VAPI product data!');
          } catch (error) {
            console.error('Error calling addItem:', error);
          }
        } else {
          console.log('Missing cart item data:', { cartItem: !!cartItem, addItem: !!addItem });
        }
      }
    },
    onConnect: () => {
      console.log('WS-CONNECTED to port 8081');
    },
    onDisconnect: () => {
      console.log('WS-DISCONNECTED from port 8081');
    },
    onError: (error: any) => {
      console.log('WS-ERROR:', error);
    },
    maxReconnectAttempts: 5, // Try multiple times
    reconnectInterval: 2000   // Wait 2 seconds between attempts
  });

  // Determine which OBJ model to load based on product type
  const getProductModelPath = useCallback(async (productTitle: string): Promise<string | null> => {
    const title = productTitle.toLowerCase();
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    try {
      // Check if there's a specific directory for this product
      const productDirPath = `/3D/${sanitizedTitle}/`;
      const testResponse = await fetch(`${productDirPath}mesh.obj`, { method: 'HEAD' });
      
      if (testResponse.ok) {
        console.log(`Found specific OBJ model for "${title}": ${productDirPath}`);
        return productDirPath;
      }
      
      // Fallback: Fetch all available GLB files from the API for compatibility
      const response = await fetch('/api/3d-models');
      if (!response.ok) {
        throw new Error('Failed to fetch 3D models directory');
      }
      const availableModels: string[] = await response.json();
      
      // Function to calculate similarity between two strings
      const calculateSimilarity = (str1: string, str2: string): number => {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // Check for exact word matches first
        const words1 = s1.split(/[\s_-]+/);
        const words2 = s2.split(/[\s_-]+/);
        
        let exactMatches = 0;
        for (const word1 of words1) {
          if (word1.length > 2) { // Only consider words longer than 2 characters
            for (const word2 of words2) {
              if (word2.length > 2 && (word2.includes(word1) || word1.includes(word2))) {
                exactMatches++;
                break;
              }
            }
          }
        }
        
        // If we have exact word matches, prioritize those
        if (exactMatches > 0) {
          return exactMatches / Math.max(words1.length, words2.length);
        }
        
        // Fallback to character-based similarity (Levenshtein distance)
        const maxLength = Math.max(s1.length, s2.length);
        if (maxLength === 0) return 1;
        
        const distance = levenshteinDistance(s1, s2);
        return 1 - distance / maxLength;
      };
      
      // Helper function for Levenshtein distance
      const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = Array(str2.length + 1).fill(null).map(() => 
          Array(str1.length + 1).fill(null)
        );
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
          for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
              matrix[j][i - 1] + 1,     // deletion
              matrix[j - 1][i] + 1,     // insertion
              matrix[j - 1][i - 1] + indicator // substitution
            );
          }
        }
        
        return matrix[str2.length][str1.length];
      };

      // Find the best match among available models
      let bestMatch = availableModels[0] || 'shoe.glb'; // fallback to first available or shoe.glb
      let highestSimilarity = 0;
      
      for (const model of availableModels) {
        const modelName = model.replace('.glb', '');
        const similarity = calculateSimilarity(title, modelName);
        
        console.log(`Comparing "${title}" with "${modelName}": similarity = ${similarity.toFixed(3)}`);
        
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = model;
        }
      }
      
      console.log(`Best match for "${title}": ${bestMatch} (similarity: ${highestSimilarity.toFixed(3)})`);
      
      // For GLB fallback compatibility, return the GLB path
      return `/3D/${bestMatch}`;
      
    } catch (error) {
      console.error('Error fetching available models:', error);
      // Return null to indicate no specific model found
      return null;
    }
  }, []);

  // Initialize Three.js scene
  const initThreeJS = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Add lights
    setupLighting(scene);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Create loaders
    const gltfLoader = new GLTFLoader();
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      currentModel: null, // Will be set when model loads
      gltfLoader,
      objLoader,
      mtlLoader,
      animationId: null
    };

    // Set the scene reference for 3D controls
    setSceneRef(sceneRef.current);

    // Start animation loop
    startAnimation();

    // Load the appropriate product model asynchronously
    const loadInitialModel = async () => {
      console.log(`Initializing 3D model for product: "${product.title}"`);
      const modelPath = await getProductModelPath(product.title);
      console.log(`Model path determined: ${modelPath}`);
      
      if (modelPath) {
        if (modelPath.endsWith('/')) {
          // It's an OBJ directory
          console.log('Loading OBJ model from directory:', modelPath);
          loadOBJModel(modelPath);
        } else {
          // It's a GLB file
          console.log('Loading GLB model:', modelPath);
          loadProductModel(modelPath);
        }
      } else {
        // No model found, show default cube
        console.log('No specific model found, showing default cube');
        const defaultModel = addDefaultCube(sceneRef.current!.scene);
        sceneRef.current!.currentModel = defaultModel;
        setIsLoading(false);
      }
    };
    loadInitialModel();

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current || !containerRef.current) return;
      
      const { camera, renderer } = sceneRef.current;
      const container = containerRef.current;
      
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [getProductModelPath, product.title]); // Add dependencies

  const setupLighting = (scene: THREE.Scene) => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Point light
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-10, 10, -10);
    scene.add(pointLight);
  };

  const addDefaultCube = (scene: THREE.Scene): THREE.Mesh => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.8
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 1;
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData = { isDefault: true };
    scene.add(cube);
    return cube;
  };

  const startAnimation = () => {
    const animate = () => {
      if (!sceneRef.current) return;

      const { scene, camera, renderer, controls, currentModel } = sceneRef.current;

      // Rotate default cube (only if it exists and is marked as default)
      if (currentModel && currentModel.userData.isDefault) {
        currentModel.rotation.x += 0.01;
        currentModel.rotation.y += 0.01;
      }

      controls.update();
      renderer.render(scene, camera);

      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate();
  };

  // Load OBJ model with MTL and texture from directory
  const loadOBJModel = async (modelDirPath: string) => {
    if (!sceneRef.current) return;

    setIsLoading(true);
    setModelInfo(null);

    const { scene, objLoader, mtlLoader, currentModel } = sceneRef.current;

    try {
      // Remove current model first
      if (currentModel) {
        scene.remove(currentModel);
        // Dispose of geometry and materials to free memory
        currentModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }

      console.log(`Loading OBJ model from: ${modelDirPath}`);
      
      // Set the resource path for MTL loader to resolve texture paths correctly
      const resourcePath = modelDirPath;
      mtlLoader.setResourcePath(resourcePath);
      
      // Load MTL file first
      const mtlPath = `${modelDirPath}mesh.mtl`;
      console.log(`Loading MTL from: ${mtlPath}`);
      
      const materials = await new Promise<THREE.MTLLoader.MaterialCreator>((resolve, reject) => {
        mtlLoader.load(
          mtlPath,
          (materials) => {
            console.log('MTL loaded successfully, preloading materials...');
            materials.preload();
            resolve(materials);
          },
          (progress) => {
            console.log('MTL loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          (error) => {
            console.error('MTL loading error:', error);
            reject(error);
          }
        );
      });

      // Apply materials to OBJ loader
      objLoader.setMaterials(materials);
      console.log('Materials applied to OBJ loader');

      // Load OBJ file
      const objPath = `${modelDirPath}mesh.obj`;
      console.log(`Loading OBJ from: ${objPath}`);
      
      const model = await new Promise<THREE.Group>((resolve, reject) => {
        objLoader.load(
          objPath,
          (object) => {
            console.log('OBJ loaded successfully:', object);
            console.log('Object children count:', object.children.length);
            object.children.forEach((child, index) => {
              console.log(`Child ${index}:`, child.type, child);
            });
            resolve(object);
          },
          (progress) => {
            console.log('OBJ loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          (error) => {
            console.error('OBJ loading error:', error);
            reject(error);
          }
        );
      });

      // Center and scale the model
      centerAndScaleModel(model);
      
      // Enable shadows
      model.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      scene.add(model);
      sceneRef.current.currentModel = model;
      
      // Update camera to fit model
      fitCameraToModel(model);

      // Calculate model info for OBJ
      const info = calculateOBJModelInfo(model);
      setModelInfo(info);

      setSelectedFile(`Product model: ${modelDirPath}mesh.obj`);
      console.log('OBJ model loaded successfully:', objPath);
      
    } catch (error) {
      console.error('Error loading OBJ model:', error);
      
      // If loading failed, fall back to default cube
      const defaultModel = addDefaultCube(sceneRef.current.scene);
      sceneRef.current.currentModel = defaultModel;
    } finally {
      setIsLoading(false);
    }
  };

  // Load GLB model from public folder
  const loadProductModel = async (modelPath: string) => {
    if (!sceneRef.current) return;

    setIsLoading(true);
    setModelInfo(null);

    const { scene, gltfLoader, currentModel } = sceneRef.current;

    try {
      // Remove current model first
      if (currentModel) {
        scene.remove(currentModel);
        // Dispose of geometry and materials to free memory
        currentModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }

      // Load new model from public folder
      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoader.load(
          modelPath,
          (gltf) => resolve(gltf),
          (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          (error) => reject(error)
        );
      });

      // Add model to scene
      const model = gltf.scene;
      
      // Center and scale the model
      centerAndScaleModel(model);
      
      // Enable shadows
      model.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      scene.add(model);
      sceneRef.current.currentModel = model;
      
      // Update camera to fit model
      fitCameraToModel(model);

      // Calculate model info
      const info = calculateModelInfo(gltf);
      setModelInfo(info);

      const modelName = modelPath.split('/').pop() || 'model';
      setSelectedFile(`Product model: ${modelName}`);
      console.log('Product model loaded successfully:', modelPath);
      
    } catch (error) {
      console.error('Error loading product model:', error);
      
      // If loading failed, fall back to default cube
      const defaultModel = addDefaultCube(sceneRef.current.scene);
      sceneRef.current.currentModel = defaultModel;
    } finally {
      setIsLoading(false);
    }
  };

  const loadModel = async (file: File) => {
    if (!sceneRef.current) return;

    setIsLoading(true);
    setModelInfo(null);

    const { scene, gltfLoader, currentModel } = sceneRef.current;
    const url = URL.createObjectURL(file);

    try {
      // Remove current model first
      if (currentModel) {
        scene.remove(currentModel);
        // Dispose of geometry and materials to free memory
        currentModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }

      // Load new model using the same pattern as main.js
      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoader.load(
          url,
          (gltf) => resolve(gltf),
          (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
          },
          (error) => reject(error)
        );
      });

      // Add model to scene (following main.js pattern)
      const model = gltf.scene;
      
      // Center and scale the model
      centerAndScaleModel(model);
      
      // Enable shadows (following main.js pattern)
      model.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      scene.add(model);
      sceneRef.current.currentModel = model;
      
      // Update camera to fit model
      fitCameraToModel(model);

      // Calculate model info
      const info = calculateModelInfo(gltf);
      setModelInfo(info);

      setSelectedFile(file.name);
      console.log('Model loaded successfully:', file.name);
      
    } catch (error) {
      console.error('Error loading model:', error);
      alert('Error loading model. Please make sure it\'s a valid .glb or .gltf file.');
      
      // If loading failed and we removed the previous model, add back the default cube
      if (!sceneRef.current.currentModel) {
        const defaultModel = addDefaultCube(sceneRef.current.scene);
        sceneRef.current.currentModel = defaultModel;
      }
    } finally {
      setIsLoading(false);
      URL.revokeObjectURL(url);
      logCurrentPositions();
    }
  };

  const centerAndScaleModel = (model: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    model.position.sub(center);

    // Scale to fit in a reasonable size (max 4 units)
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (maxDimension > 4) {
      const scale = 4 / maxDimension;
      model.scale.setScalar(scale);
    }

    // Place on ground
    const newBox = new THREE.Box3().setFromObject(model);
    model.position.y -= newBox.min.y;
  };

  const fitCameraToModel = (model: THREE.Object3D) => {
    if (!sceneRef.current) return;

    const { camera, controls } = sceneRef.current;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    // Position camera based on model size
    const distance = maxDimension * 2;
    camera.position.set(distance, distance, distance);
    camera.lookAt(0, size.y / 2, 0);
    controls.target.set(0, size.y / 2, 0);
    controls.update();
  };

  const calculateModelInfo = (gltf: any): ModelInfo => {
    const scene = gltf.scene;
    let meshCount = 0;
    let materialCount = 0;
    let textureCount = 0;

    scene.traverse((node: any) => {
      if (node.isMesh) meshCount++;
      if (node.material) {
        materialCount++;
        if (node.material.map) textureCount++;
      }
    });

    return {
      meshes: meshCount,
      materials: materialCount,
      textures: textureCount,
      animations: gltf.animations.length
    };
  };

  const calculateOBJModelInfo = (object: THREE.Group): ModelInfo => {
    let meshCount = 0;
    let materialCount = 0;
    let textureCount = 0;

    object.traverse((node: any) => {
      if (node.isMesh) meshCount++;
      if (node.material) {
        materialCount++;
        if (node.material.map) textureCount++;
      }
    });

    return {
      meshes: meshCount,
      materials: materialCount,
      textures: textureCount,
      animations: 0 // OBJ files don't contain animations
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndLoadFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      validateAndLoadFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only remove drag-over if we're actually leaving the drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleUploadClick = () => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const validateAndLoadFile = (file: File) => {
    console.log('File dropped/selected:', file.name, file.type, file.size);
    
    // Validate file type (supporting both GLB/GLTF and OBJ files)
    const validTypes = ['model/gltf+json', 'model/gltf-binary', 'application/octet-stream'];
    const validExtensions = ['.glb', '.gltf', '.obj'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      alert('Please select a valid 3D model file (.glb, .gltf, or .obj)');
      return;
    }

    // Additional size check (optional - prevent very large files)
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert('File is too large. Please select a file smaller than 100MB.');
      return;
    }

    console.log('File validation passed, loading model...');
    loadModel(file);
  };

  const resetView = () => {
    if (!sceneRef.current) return;
    
    const { camera, controls, currentModel } = sceneRef.current;
    
    if (currentModel) {
      if (currentModel.userData.isDefault) {
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
      } else {
        fitCameraToModel(currentModel);
      }
      controls.update();
    }
  };

  // Initialize Three.js when component mounts
  useEffect(() => {
    const cleanup = initThreeJS();
    
    // Initialize WebSocket server when component loads
    initializeWebhookServer();
    
    // Prevent default drag behaviors on the document
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDocumentDragOver = (e: Event) => preventDefaults(e);
    const handleDocumentDrop = (e: Event) => preventDefaults(e);

    document.addEventListener('dragenter', preventDefaults, false);
    document.addEventListener('dragover', handleDocumentDragOver, false);
    document.addEventListener('dragleave', preventDefaults, false);
    document.addEventListener('drop', handleDocumentDrop, false);
    
    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      
      document.removeEventListener('dragenter', preventDefaults, false);
      document.removeEventListener('dragover', handleDocumentDragOver, false);
      document.removeEventListener('dragleave', preventDefaults, false);
      document.removeEventListener('drop', handleDocumentDrop, false);
      
      cleanup?.();
    };
  }, [initThreeJS]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white text-sm">Loading 3D model...</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div 
        className={cn(
          "absolute top-4 left-4 right-4 p-4 backdrop-blur-sm rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragOver 
            ? "border-blue-400 bg-blue-100/30 scale-105 shadow-lg" 
            : "border-gray-400 bg-white/20 hover:bg-white/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <input
          id="file-input"
          type="file"
          accept=".glb,.gltf,.obj"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="text-center">
          <div className="mb-2">
            {isDragOver ? (
              <svg className="w-8 h-8 mx-auto text-blue-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            ) : (
              <svg className="w-8 h-8 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
              </svg>
            )}
          </div>
          <p className={cn(
            "text-sm font-medium transition-colors",
            isDragOver ? "text-blue-700" : "text-gray-700 dark:text-gray-300"
          )}>
            {selectedFile 
              ? `${selectedFile}` 
              : isDragOver 
                ? 'Drop your 3D model here!' 
                : 'Drop custom GLB/GLTF/OBJ file here or click to upload'
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {product.title} - 3D Model Viewer
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button 
          onClick={resetView}
          className="w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
          title="Reset View"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 3D Badge */}
      <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
        3D View
      </div>

      {/* VAPI Chat Interface */}
      <div className="absolute bottom-4 left-4 w-80">
        <VapiChat 
          productContext={{
            id: product.id,
            name: product.title,
            price: product.priceRange.maxVariantPrice.amount + ' ' + product.priceRange.maxVariantPrice.currencyCode,
            description: product.description,
            detailedDescription: product.detailedDescription || product.description
          }}
        />
        
        {/* WebSocket Connection Status */}
        <div className="mt-2">
          <div
            className={cn(
              "px-3 py-1 text-xs rounded-full transition-colors",
              enableWebSocket 
                ? "bg-green-100 text-green-700 border border-green-300" 
                : "bg-gray-100 text-gray-600 border border-gray-300"
            )}
          >
            {enableWebSocket ? '🟢 WebSocket ON' : '⚫ WebSocket OFF'}
          </div>
          {isConnected && (
            <span className="ml-2 text-xs text-green-600">Connected</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile 3D Viewer (equivalent to MobileGallerySlider) - WebSocket disabled
export function Mobile3DViewer({ product }: { product: Product }) {
  return (
    <div className="w-full h-full">
      <Product3DViewer product={product} className="w-full h-full" enableWebSocket={false} />
    </div>
  );
}

// Desktop 3D Viewer (equivalent to DesktopGallery) - WebSocket enabled
export function Desktop3DViewer({ product }: { product: Product }) {
  return (
    <div className="w-full h-full min-h-screen p-4">
      <Product3DViewer product={product} className="w-full h-full" enableWebSocket={true} />
    </div>
  );
}