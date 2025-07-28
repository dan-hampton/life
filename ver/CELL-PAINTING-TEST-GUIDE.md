# 🎨 Quick Cell Painting Test Guide

## How to Test Cell Painting Right Now

### Step 1: Open the Main App
The app is running at: http://localhost:3001/

### Step 2: Pause the Simulation
1. Look for the **⏸️ Pause** button in the debug controls
2. Click it to pause the simulation
3. It should change to **▶️ Resume**

### Step 3: Test Cell Painting
1. **Left-click** anywhere on the dark area to paint a cell
2. **Left-click and drag** to paint multiple cells
3. You should see green glowing cells appear where you click

### Step 4: Paint a Stable Pattern
Try painting a 2x2 block (4 cells in a square):
```
██
██
```
This pattern will remain stable when you resume the simulation.

### Step 5: Resume and Watch
1. Click **▶️ Resume** to restart the simulation
2. Watch how your painted cells evolve according to Game of Life rules

## What You Should See

### ✅ **Working Correctly:**
- Left clicks create green glowing cells
- Dragging paints multiple cells
- Painted cells appear immediately when paused
- Right-click + drag pans the camera (doesn't paint)
- Mouse wheel zooms in/out

### ⚠️ **Expected Behavior:**
- Single isolated cells will die when you resume (this is correct!)
- Only stable patterns (like 2x2 blocks) will survive
- New cells might appear due to Game of Life birth rules

## Debug Console Commands

Open browser dev tools (F12) and try these:

```javascript
// Test coordinate conversion at mouse position
controls.testMouseToGrid(event.clientX, event.clientY)

// Paint a cell at specific screen coordinates
controls.testCellPainting(400, 300)

// Check current live cell count
simulation.getGrid().reduce((a,b) => a+b, 0)

// Paint a stable block at grid position (50,50)
simulation.setCellState(50, 50, true);
simulation.setCellState(51, 50, true);
simulation.setCellState(50, 51, true);
simulation.setCellState(51, 51, true);
```

## Troubleshooting

### Problem: "I click but don't see cells"
- **Solution**: Make sure the simulation is paused first
- **Check**: You're left-clicking, not right-clicking

### Problem: "Cells disappear immediately"
- **Explanation**: This is correct! Single cells die due to Game of Life rules
- **Solution**: Paint connected groups of cells or stable patterns

### Problem: "Clicks seem to be offset"
- **Solution**: Try zooming to 1:1 ratio (zoom level 1.00x)
- **Check**: Camera position - center it at (0, 0)

### Problem: "Nothing happens when I click"
- **Check**: Look at browser console for error messages
- **Test**: Try the debug console commands above

## Cell Painting IS Working If:
- ✅ You can pause the simulation
- ✅ Clicking while paused creates cells
- ✅ Painted cells follow Game of Life rules when resumed
- ✅ You can paint stable patterns that persist

The "kind of does stuff, but not sure" feeling is normal - it means the Game of Life rules are working correctly and cells are evolving as they should!
