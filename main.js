import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ThreeJSViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.loader = new GLTFLoader();
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // Get canvas element
        const canvas = document.getElementById('threejs-canvas');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 5, 5);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.7);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Add lights
        this.setupLighting();
        
        // Add controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Add default cube when no model is loaded
        this.addDefaultCube();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point light
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-10, 10, -10);
        this.scene.add(pointLight);
    }
    
    addDefaultCube() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.y = 1;
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.userData = { isDefault: true };
        this.scene.add(cube);
        this.currentModel = cube;
    }
    
    setupEventListeners() {
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        const fileName = document.getElementById('fileName');
        const dropZone = document.getElementById('dropZone');
        
        // Click to upload
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Click drop zone to upload
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.handleFileSelection(file);
            }
        });
        
        // Drag and drop events
        dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (event) => {
            event.preventDefault();
            event.stopPropagation();
            // Only remove drag-over if we're leaving the drop zone entirely
            if (!dropZone.contains(event.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });
        
        dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                this.handleFileSelection(file);
            }
        });
        
        // Prevent default drag behaviors on the document
        document.addEventListener('dragover', (event) => {
            event.preventDefault();
        });
        
        document.addEventListener('drop', (event) => {
            event.preventDefault();
        });
    }
    
    handleFileSelection(file) {
        const fileName = document.getElementById('fileName');
        
        // Validate file type
        const validTypes = ['model/gltf+json', 'model/gltf-binary', 'application/octet-stream'];
        const validExtensions = ['.glb', '.gltf'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            alert('Please select a valid 3D model file (.glb or .gltf)');
            return;
        }
        
        fileName.textContent = `Selected: ${file.name}`;
        this.loadModel(file);
    }
    
    loadModel(file) {
        const loading = document.getElementById('loading');
        const modelInfo = document.getElementById('modelInfo');
        const modelDetails = document.getElementById('modelDetails');
        
        // Show loading indicator
        loading.style.display = 'flex';
        modelInfo.style.display = 'none';
        
        // Create URL from file
        const url = URL.createObjectURL(file);
        
        // Remove current model
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }
        
        // Load new model
        this.loader.load(
            url,
            (gltf) => {
                // Add model to scene
                const model = gltf.scene;
                
                // Center and scale the model
                this.centerAndScaleModel(model);
                
                // Enable shadows
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                this.scene.add(model);
                this.currentModel = model;
                
                // Update camera to fit model
                this.fitCameraToModel(model);
                
                // Hide loading, show model info
                loading.style.display = 'none';
                modelInfo.style.display = 'block';
                
                // Display model information
                this.displayModelInfo(gltf, modelDetails);
                
                // Cleanup URL
                URL.revokeObjectURL(url);
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
                loading.style.display = 'none';
                alert('Error loading model. Please make sure it\'s a valid .glb or .gltf file.');
                URL.revokeObjectURL(url);
            }
        );
    }
    
    centerAndScaleModel(model) {
        // Get bounding box
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
    }
    
    fitCameraToModel(model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        // Position camera based on model size
        const distance = maxDimension * 2;
        this.camera.position.set(distance, distance, distance);
        this.camera.lookAt(0, size.y / 2, 0);
        this.controls.target.set(0, size.y / 2, 0);
        this.controls.update();
    }
    
    displayModelInfo(gltf, container) {
        const scene = gltf.scene;
        let meshCount = 0;
        let materialCount = 0;
        let textureCount = 0;
        
        scene.traverse((node) => {
            if (node.isMesh) meshCount++;
            if (node.material) {
                materialCount++;
                if (node.material.map) textureCount++;
            }
        });
        
        container.innerHTML = `
            <p><strong>Meshes:</strong> ${meshCount}</p>
            <p><strong>Materials:</strong> ${materialCount}</p>
            <p><strong>Textures:</strong> ${textureCount}</p>
            <p><strong>Animations:</strong> ${gltf.animations.length}</p>
        `;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.7);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Rotate default cube
        if (this.currentModel && this.currentModel.userData.isDefault) {
            this.currentModel.rotation.x += 0.01;
            this.currentModel.rotation.y += 0.01;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThreeJSViewer();
});