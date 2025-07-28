/**
 * Game of Life Simulation Engine
 * Implements Conway's Game of Life with optimized 2D arrays
 */

// Import audio manager for sound effects (Tasks 58 & 59)
import { audioManager } from '../src/audio.js';

export class Simulation {
  /**
   * Number of births and deaths in the last update (for audio/visual feedback)
   */
  public lastBirths: number = 0;
  public lastDeaths: number = 0;
  private width: number;
  private height: number;
  private currentGrid: Uint8Array;
  private nextGrid: Uint8Array;
  
  // Task 38: Track cell ages for animated transitions
  private currentAges: Uint16Array;
  private nextAges: Uint16Array;
  
  // Task 42: Track dying cells for one frame
  private dyingCells: Set<number>;

  // Dynamic seeding options to keep simulation alive longer
  public autoSeedEnabled: boolean = true;
  public edgeWrapping: boolean = true;
  private frameCount: number = 0;
  private activityHistory: number[] = [];
  private lastSeedFrame: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    
    // Create two 2D arrays represented as 1D arrays for better performance
    this.currentGrid = new Uint8Array(width * height);
    this.nextGrid = new Uint8Array(width * height);
    
    // Task 38: Initialize age tracking arrays
    this.currentAges = new Uint16Array(width * height);
    this.nextAges = new Uint16Array(width * height);
    
    // Task 42: Initialize dying cells tracking
    this.dyingCells = new Set<number>();
  }

  /**
   * Initialize the grid with a random pattern of live/dead cells
   * @param density - Probability of a cell being alive (0.0 to 1.0)
   */
  initializeRandom(density: number = 0.25): void {
    for (let i = 0; i < this.currentGrid.length; i++) {
      this.currentGrid[i] = Math.random() < density ? 1 : 0;
      // Task 38: Initialize ages - newly born cells start with age 1
      this.currentAges[i] = this.currentGrid[i] === 1 ? 1 : 0;
    }
    // Clear dying cells set
    this.dyingCells.clear();
  }

  /**
   * Convert 2D coordinates to 1D array index
   */
  private getIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  /**
   * Get cell state at given coordinates with boundary wrapping
   */
  private getCellState(x: number, y: number): number {
    // Handle wrapping around the grid edges
    const wrappedX = ((x % this.width) + this.width) % this.width;
    const wrappedY = ((y % this.height) + this.height) % this.height;
    return this.currentGrid[this.getIndex(wrappedX, wrappedY)];
  }

  /**
   * Count the number of live neighbors around a cell at position (x, y)
   * Supports both bounded and toroidal (wrapped) worlds
   * @param x - X coordinate of the cell
   * @param y - Y coordinate of the cell
   * @returns Number of live neighbors (0-8)
   */
  private countLiveNeighbors(x: number, y: number): number {
    let count = 0;
    
    // Check all 8 neighboring positions
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        // Skip the center cell (the cell itself)
        if (dx === 0 && dy === 0) continue;
        
        let nx = x + dx;
        let ny = y + dy;
        
        if (this.edgeWrapping) {
          // Toroidal world - wrap around edges
          nx = ((nx % this.width) + this.width) % this.width;
          ny = ((ny % this.height) + this.height) % this.height;
        } else {
          // Bounded world - skip out-of-bounds neighbors
          if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
            continue;
          }
        }
        
        const neighborIndex = this.getIndex(nx, ny);
        count += this.currentGrid[neighborIndex];
      }
    }
    
    return count;
  }  /**
   * Core Game of Life update method
   * Applies Conway's rules to every cell in the grid
   * Task 38: Also updates cell ages for animation
   * Task 42: Tracks dying cells for fade-out effects
   * Tasks 58 & 59: Plays sound effects for cell birth and death
   * Auto-seeding: Maintains activity to prevent stagnation
   */
  update(): void {
    this.frameCount++;
    
    // Reset last births/deaths
    this.lastBirths = 0;
    this.lastDeaths = 0;
    // Task 42: Clear previous dying cells and track new ones
    this.dyingCells.clear();

    // Collect major events for sound batching
    const birthEvents: {x: number}[] = [];
    const deathEvents: {x: number}[] = [];

    // Iterate through every cell in the grid
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = this.getIndex(x, y);
        const currentState = this.currentGrid[index];
        const currentAge = this.currentAges[index];
        const neighbors = this.countLiveNeighbors(x, y);

        let nextState = 0;
        let nextAge = 0;

        if (currentState === 1) {
          if (neighbors === 2 || neighbors === 3) {
            nextState = 1;
            nextAge = Math.min(currentAge + 1, 65535);
          } else {
            this.dyingCells.add(index);
            // Collect death event
            deathEvents.push({x});
          }
        } else {
          if (neighbors === 3) {
            nextState = 1;
            nextAge = 1;
            // Collect birth event
            birthEvents.push({x});
          }
        }

        this.nextGrid[index] = nextState;
        this.nextAges[index] = nextAge;
      }
    }

    // Store birth/death counts for this frame
    this.lastBirths = birthEvents.length;
    this.lastDeaths = deathEvents.length;
    
    // Track activity for auto-seeding
    const totalActivity = this.lastBirths + this.lastDeaths;
    this.activityHistory.push(totalActivity);
    if (this.activityHistory.length > 60) { // Keep last 60 frames (about 1 second at 60fps)
      this.activityHistory.shift();
    }
    
    // Auto-seed if activity is low
    if (this.autoSeedEnabled && this.shouldAutoSeed()) {
      this.injectActivity();
      this.lastSeedFrame = this.frameCount;
    }
    
    // (No longer play individual birth/death sounds here; handled by drone)
    
    // Swap the current and next state grids
    const tempGrid = this.currentGrid;
    this.currentGrid = this.nextGrid;
    this.nextGrid = tempGrid;
    
    // Task 38: Swap the age arrays as well
    const tempAges = this.currentAges;
    this.currentAges = this.nextAges;
    this.nextAges = tempAges;
  }

  /**
   * Get the current grid state (read-only)
   */
  getGrid(): Uint8Array {
    return this.currentGrid;
  }

  /**
   * Task 38: Get the current cell ages (read-only)
   */
  getAges(): Uint16Array {
    return this.currentAges;
  }

  /**
   * Task 42: Get the set of dying cell indices (read-only)
   */
  getDyingCells(): Set<number> {
    return this.dyingCells;
  }

  /**
   * Detect if auto-seeding should occur based on recent activity
   */
  private shouldAutoSeed(): boolean {
    // Don't seed too frequently
    if (this.frameCount - this.lastSeedFrame < 300) { // Wait at least 5 seconds between seeds
      return false;
    }
    
    // Calculate average activity over recent frames
    if (this.activityHistory.length < 30) {
      return false; // Need some history first
    }
    
    const recentActivity = this.activityHistory.slice(-30); // Last 30 frames
    const avgActivity = recentActivity.reduce((sum, val) => sum + val, 0) / recentActivity.length;
    
    // Seed if activity is very low (less than 2 births+deaths per frame on average)
    return avgActivity < 2.0;
  }

  /**
   * Inject interesting patterns to maintain activity
   */
  private injectActivity(): void {
    const patterns = [
      this.injectGlider,
      this.injectOscillator,
      this.injectRandomCluster,
      this.injectSpaceship
    ];
    
    // Choose a random pattern injection method
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    pattern.call(this);
    
    console.log('🌱 Auto-seeded activity to maintain dynamics');
  }

  /**
   * Inject a glider pattern at a random edge location
   */
  private injectGlider(): void {
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let x: number, y: number;
    
    switch (edge) {
      case 0: // Top edge
        x = Math.floor(Math.random() * (this.width - 10)) + 5;
        y = 2;
        break;
      case 1: // Right edge  
        x = this.width - 3;
        y = Math.floor(Math.random() * (this.height - 10)) + 5;
        break;
      case 2: // Bottom edge
        x = Math.floor(Math.random() * (this.width - 10)) + 5;
        y = this.height - 3;
        break;
      default: // Left edge
        x = 2;
        y = Math.floor(Math.random() * (this.height - 10)) + 5;
        break;
    }
    
    // Standard glider pattern
    const gliderPattern = [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1]
    ];
    
    this.injectPattern(x, y, gliderPattern);
  }

  /**
   * Inject an oscillator (blinker) pattern
   */
  private injectOscillator(): void {
    const x = Math.floor(Math.random() * (this.width - 6)) + 3;
    const y = Math.floor(Math.random() * (this.height - 6)) + 3;
    
    // Vertical blinker
    const blinkerPattern = [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0]
    ];
    
    this.injectPattern(x, y, blinkerPattern);
  }

  /**
   * Inject a random cluster of cells
   */
  private injectRandomCluster(): void {
    const x = Math.floor(Math.random() * (this.width - 8)) + 4;
    const y = Math.floor(Math.random() * (this.height - 8)) + 4;
    
    // Create a small random cluster
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.random() < 0.6) { // 60% chance for each cell
          this.setCellState(x + dx, y + dy, true);
        }
      }
    }
  }

  /**
   * Inject a lightweight spaceship (LWSS)
   */
  private injectSpaceship(): void {
    const x = Math.floor(Math.random() * (this.width - 10)) + 5;
    const y = Math.floor(Math.random() * (this.height - 10)) + 5;
    
    // LWSS pattern
    const lwssPattern = [
      [1, 0, 0, 1, 0],
      [0, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [0, 1, 1, 1, 1]
    ];
    
    this.injectPattern(x, y, lwssPattern);
  }

  /**
   * Helper method to inject a pattern at given coordinates
   */
  private injectPattern(startX: number, startY: number, pattern: number[][]): void {
    for (let y = 0; y < pattern.length; y++) {
      for (let x = 0; x < pattern[y].length; x++) {
        if (pattern[y][x] === 1) {
          const worldX = startX + x;
          const worldY = startY + y;
          if (worldX >= 0 && worldX < this.width && worldY >= 0 && worldY < this.height) {
            this.setCellState(worldX, worldY, true);
          }
        }
      }
    }
  }

  /**
   * Get grid dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Set the state of a specific cell
   * Task 38: Also handles age when manually setting cell state
   */
  setCellState(x: number, y: number, isAlive: boolean): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const index = this.getIndex(x, y);
      this.currentGrid[index] = isAlive ? 1 : 0;
      // Task 38: Set age appropriately
      this.currentAges[index] = isAlive ? 1 : 0; // Newly set cells start with age 1
    }
  }

  /**
   * Clear all cells (set all to dead)
   * Task 38: Also clears all ages
   */
  clear(): void {
    this.currentGrid.fill(0);
    this.currentAges.fill(0);
    this.dyingCells.clear();
  }

  /**
   * Get the state of a specific cell
   */
  getCellAt(x: number, y: number): boolean {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.currentGrid[this.getIndex(x, y)] === 1;
    }
    return false;
  }
}
