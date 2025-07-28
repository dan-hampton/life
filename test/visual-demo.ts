import { Simulation } from '../test/simulation.js';

/**
 * Visual demonstration of the Game of Life simulation
 */
function visualDemo() {
  console.log('🎮 Game of Life Visual Demo\n');
  
  const sim = new Simulation(20, 15);
  
  // Create a glider pattern (famous moving pattern)
  console.log('Creating a Glider pattern...\n');
  sim.clear();
  
  // Glider pattern
  sim.setCellState(1, 0, true);
  sim.setCellState(2, 1, true);
  sim.setCellState(0, 2, true);
  sim.setCellState(1, 2, true);
  sim.setCellState(2, 2, true);
  
  // Run the simulation for several generations
  for (let generation = 0; generation < 10; generation++) {
    console.log(`Generation ${generation}:`);
    printFullGrid(sim);
    console.log('');
    
    if (generation < 9) sim.update();
    
    // Add a small delay for visual effect (in a real app, this would be frame-based)
    if (generation < 9) {
      // Just proceed to next generation immediately for demo
    }
  }
  
  console.log('🚀 Glider has moved across the grid!');
}

function printFullGrid(sim: Simulation) {
  const { width, height } = sim.getDimensions();
  
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      row += sim.getCellAt(x, y) ? '●' : '·';
    }
    console.log(row);
  }
}

// Run the visual demo
visualDemo();
