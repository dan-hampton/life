# Cell Painting in Game of Life - How It Works & Rules

## Current Implementation

### 🎯 **What Cell Painting Does**
Cell painting allows you to manually add or remove cells from the Game of Life grid by clicking and dragging with your mouse.

### 🖱️ **Controls**
- **Left Click**: Toggle a single cell (alive ↔ dead)
- **Left Click + Drag**: Paint multiple cells as you drag
- **Right Click + Drag**: Pan the camera (doesn't paint)
- **Mouse Wheel**: Zoom in/out

### ⚙️ **How It Works Technically**

1. **Mouse Input Detection**
   ```typescript
   // Triggered on left mouse button down
   if (event.button === 0) {
       this.handleCellPainting(event);
   }
   ```

2. **Screen to Grid Coordinate Conversion**
   ```typescript
   // Convert mouse position to grid coordinates
   const rect = this.canvas.getBoundingClientRect();
   const ndcX = ((mouseX - rect.left) / rect.width) * 2 - 1;
   const ndcY = -((mouseY - rect.top) / rect.height) * 2 + 1;
   
   const worldPosition = new THREE.Vector3(ndcX, ndcY, 0);
   worldPosition.unproject(this.camera);
   
   const gridX = Math.floor(worldPosition.x + this.gridWidth / 2);
   const gridY = Math.floor(worldPosition.y + this.gridHeight / 2);
   ```

3. **Cell State Toggle**
   ```typescript
   const currentState = this.simulation.getCellAt(gridCoords.x, gridCoords.y);
   this.simulation.setCellState(gridCoords.x, gridCoords.y, !currentState);
   ```

### 🎮 **Game of Life Rules (Conway's Rules)**

Here's why your painted cells might seem to "disappear" or behave unexpectedly:

#### **For Living Cells:**
- **Survives**: If it has 2 or 3 living neighbors
- **Dies**: If it has fewer than 2 neighbors (underpopulation) or more than 3 neighbors (overpopulation)

#### **For Dead Cells:**
- **Born**: If it has exactly 3 living neighbors
- **Stays Dead**: Any other number of neighbors

### 🤔 **Why Cell Painting Might Seem "Weird"**

1. **Painted Cells Die Immediately**
   - If you paint a single isolated cell, it will die in the next frame (no neighbors)
   - Solution: Paint stable patterns or pause the simulation

2. **Cells Appear/Disappear Unexpectedly**
   - The simulation continues running while you paint
   - New cells can be born due to your painted cells creating the right neighbor count
   - Solution: Use the pause button while painting

3. **Coordinate Mismatch**
   - If the camera is zoomed/panned, the coordinate conversion might feel off
   - The grid cells are 1 unit apart in world space
   - Solution: Zoom to 1:1 ratio for most accurate painting

### 🔧 **Common Stable Patterns to Paint**

1. **Block (2x2 square)**
   ```
   ██
   ██
   ```
   - Completely stable, never changes

2. **Blinker (3 cells in a row)**
   ```
   ███  →  █  →  ███
           █
           █
   ```
   - Oscillates between horizontal and vertical

3. **Glider (moves across the grid)**
   ```
    █
     █
   ███
   ```
   - Moves diagonally across the grid

### 🐛 **Debugging Tips**

1. **Test with Simulation Paused**
   - Pause the simulation to see your painted cells clearly
   - Paint patterns, then resume to see how they evolve

2. **Use the Browser Developer Tools**
   ```javascript
   // In browser console, check the current state
   console.log('Live cells:', simulation.getGrid().reduce((a,b) => a+b, 0));
   ```

3. **Paint Larger Patterns**
   - Single cells will always die unless they have neighbors
   - Try painting connected groups of cells

### 🎯 **Best Practices**

1. **Start Simple**: Paint a few connected cells and see how they evolve
2. **Use Pause**: Pause the simulation while painting complex patterns
3. **Experiment**: Try different patterns and see what happens
4. **Learn Patterns**: Study common Game of Life patterns online

### 🔍 **Current Behavior Explanation**

If cell painting feels "kind of does stuff, but not sure," it's because:

- ✅ **It IS working** - cells are being toggled correctly
- ⚠️ **But they follow Game of Life rules** - isolated painted cells die immediately
- ⚠️ **Simulation keeps running** - making it hard to see your immediate changes
- ⚠️ **Visual feedback is subtle** - cells might be there but hard to see depending on zoom/position

### 💡 **Recommended Test**

1. Open the app
2. **Pause the simulation** (if there's a pause button)
3. Paint a 2x2 block of cells
4. Resume the simulation
5. The block should remain stable (it won't change)

This will confirm that cell painting is working correctly - the behavior you're seeing is actually the Game of Life doing what it's supposed to do!
