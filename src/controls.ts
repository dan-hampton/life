import * as THREE from 'three';
import { Simulation } from './simulation';

export class Controls {
    private camera: THREE.OrthographicCamera;
    private simulation: Simulation;
    private canvas: HTMLCanvasElement;
    
    // Mouse state
    private isMouseDown = false;
    private lastMousePosition = new THREE.Vector2();
    private mouseButton = -1;
    
    // Camera state
    private targetCameraPosition = new THREE.Vector3();
    private targetZoom = 1;
    private currentZoom = 1;
    
    // Lerp factor for smooth camera movement
    private lerpFactor = 0.1;
    
    // Grid dimensions for coordinate conversion
    private gridWidth: number;
    private gridHeight: number;
    
    constructor(
        camera: THREE.OrthographicCamera, 
        renderer: THREE.WebGLRenderer, 
        simulation: Simulation,
        gridWidth: number,
        gridHeight: number
    ) {
        this.camera = camera;
        this.simulation = simulation;
        this.canvas = renderer.domElement;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        
        // Initialize target positions with current camera state
        this.targetCameraPosition.copy(camera.position);
        this.targetZoom = camera.zoom;
        this.currentZoom = camera.zoom;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Wheel event for zooming
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    private onMouseDown(event: MouseEvent): void {
        this.isMouseDown = true;
        this.mouseButton = event.button;
        this.lastMousePosition.set(event.clientX, event.clientY);
        
        // If left click, handle cell painting
        if (event.button === 0) {
            this.handleCellPainting(event);
        }
    }
    
    private onMouseUp(_event: MouseEvent): void {
        this.isMouseDown = false;
        this.mouseButton = -1;
    }
    
    private onMouseMove(event: MouseEvent): void {
        const currentMousePosition = new THREE.Vector2(event.clientX, event.clientY);
        
        if (this.isMouseDown) {
            const deltaX = currentMousePosition.x - this.lastMousePosition.x;
            const deltaY = currentMousePosition.y - this.lastMousePosition.y;
            
            // Handle panning (right mouse button or middle mouse button)
            if (this.mouseButton === 2 || this.mouseButton === 1) {
                this.handlePanning(deltaX, deltaY);
            }
            
            // Handle cell painting while dragging (left mouse button)
            if (this.mouseButton === 0) {
                this.handleCellPainting(event);
            }
        }
        
        this.lastMousePosition.copy(currentMousePosition);
    }
    
    private onWheel(event: WheelEvent): void {
        event.preventDefault();
        
        // Zoom factor - smaller values for more precise control
        const zoomFactor = 0.1;
        const zoomDelta = event.deltaY > 0 ? -zoomFactor : zoomFactor;
        
        // Update target zoom with limits
        this.targetZoom = THREE.MathUtils.clamp(
            this.targetZoom + zoomDelta,
            0.1, // Minimum zoom (zoomed out)
            10   // Maximum zoom (zoomed in)
        );
    }
    
    private handlePanning(deltaX: number, deltaY: number): void {
        // Convert mouse movement to world space movement
        // The movement should be inversely proportional to zoom level
        const movementFactor = 1 / this.currentZoom;
        
        // Calculate world space movement
        const worldDeltaX = -deltaX * movementFactor * 0.01;
        const worldDeltaY = deltaY * movementFactor * 0.01;
        
        // Update target camera position
        this.targetCameraPosition.x += worldDeltaX;
        this.targetCameraPosition.y += worldDeltaY;
    }
    
    private handleCellPainting(event: MouseEvent): void {
        const gridCoords = this.mouseToGridCoordinates(event.clientX, event.clientY);
        
        if (gridCoords) {
            // Toggle the cell state (or always set to alive - you can modify this behavior)
            const currentState = this.simulation.getCellAt(gridCoords.x, gridCoords.y);
            this.simulation.setCellState(gridCoords.x, gridCoords.y, !currentState);
            
            // Debug logging
           // console.log(`🎨 Painted cell at grid (${gridCoords.x}, ${gridCoords.y}): ${currentState ? 'killed' : 'born'}`);
        } else {
            console.log('❌ Click outside grid bounds at screen coordinates:', event.clientX, event.clientY);
        }
    }
    
    private mouseToGridCoordinates(mouseX: number, mouseY: number): { x: number, y: number } | null {
        // Get canvas bounds
        const rect = this.canvas.getBoundingClientRect();
        
        // Convert to normalized device coordinates (-1 to 1)
        const ndcX = ((mouseX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((mouseY - rect.top) / rect.height) * 2 + 1;
        
        // Convert to world coordinates using camera projection
        const worldPosition = new THREE.Vector3(ndcX, ndcY, 0);
        worldPosition.unproject(this.camera);
        
        // Convert world coordinates to grid coordinates
        // Assuming the grid is centered at origin and each cell is 1 unit
        const gridX = Math.floor(worldPosition.x + this.gridWidth / 2);
        const gridY = Math.floor(worldPosition.y + this.gridHeight / 2);
        
        // Check bounds
        if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
            return { x: gridX, y: gridY };
        }
        
        return null;
    }
    
    /**
     * Update method to be called each frame for smooth camera movement
     */
    public update(): void {
        // Smooth camera position interpolation
        this.camera.position.lerp(this.targetCameraPosition, this.lerpFactor);
        
        // Smooth zoom interpolation
        this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, this.targetZoom, this.lerpFactor);
        this.camera.zoom = this.currentZoom;
        
        // Update camera projection matrix
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Get current camera position (useful for debugging or UI display)
     */
    public getCameraPosition(): THREE.Vector3 {
        return this.camera.position.clone();
    }
    
    /**
     * Get current zoom level (useful for debugging or UI display)
     */
    public getZoomLevel(): number {
        return this.currentZoom;
    }
    
    /**
     * Set camera position programmatically
     */
    public setCameraPosition(x: number, y: number, z: number): void {
        this.targetCameraPosition.set(x, y, z);
    }
    
    /**
     * Set zoom level programmatically
     */
    public setZoom(zoom: number): void {
        this.targetZoom = THREE.MathUtils.clamp(zoom, 0.1, 10);
    }
    
    /**
     * Reset camera to default position and zoom
     */
    public resetCamera(): void {
        this.setCameraPosition(0, 0, this.camera.position.z);
        this.setZoom(1);
    }
    
    /**
     * Cleanup event listeners
     */
    public dispose(): void {
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('wheel', this.onWheel);
    }
    
    /**
     * Public method for testing coordinate conversion
     */
    public testMouseToGrid(mouseX: number, mouseY: number): { x: number, y: number } | null {
        return this.mouseToGridCoordinates(mouseX, mouseY);
    }
    
    /**
     * Public method for testing cell painting
     */
    public testCellPainting(mouseX: number, mouseY: number): boolean {
        const gridCoords = this.mouseToGridCoordinates(mouseX, mouseY);
        if (gridCoords) {
            const currentState = this.simulation.getCellAt(gridCoords.x, gridCoords.y);
            this.simulation.setCellState(gridCoords.x, gridCoords.y, !currentState);
            console.log(`Painted cell at grid (${gridCoords.x}, ${gridCoords.y}): ${currentState ? 'killed' : 'born'}`);
            return true;
        }
        return false;
    }
}
