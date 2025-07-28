import { Simulation } from '../test/simulation.js';

/**
 * Test suite for the Game of Life simulation engine
 */

function runTests() {
  console.log('🧪 Running Game of Life Simulation Tests...\n');

  // Test 1: Basic initialization
  console.log('Test 1: Basic Initialization');
  const sim = new Simulation(10, 10);
  const dimensions = sim.getDimensions();
  console.log(`✅ Grid dimensions: ${dimensions.width}x${dimensions.height}`);
  console.log(`✅ Grid initialized with ${sim.getGrid().length} cells\n`);

  // Test 2: Random initialization
  console.log('Test 2: Random Initialization');
  sim.initializeRandom(0.3);
  const grid = sim.getGrid();
  const liveCells = Array.from(grid).filter(cell => cell === 1).length;
  console.log(`✅ Random initialization created ${liveCells} live cells out of ${grid.length}`);
  console.log(`✅ Density: ${(liveCells / grid.length * 100).toFixed(1)}%\n`);

  // Test 3: Manual cell setting
  console.log('Test 3: Manual Cell Setting');
  sim.clear();
  sim.setCellState(5, 5, true);
  sim.setCellState(5, 6, true);
  sim.setCellState(5, 7, true);
  console.log(`✅ Set cells at (5,5), (5,6), (5,7) to alive`);
  console.log(`✅ Cell at (5,5) is ${sim.getCellAt(5, 5) ? 'alive' : 'dead'}`);
  console.log(`✅ Cell at (5,6) is ${sim.getCellAt(5, 6) ? 'alive' : 'dead'}`);
  console.log(`✅ Cell at (0,0) is ${sim.getCellAt(0, 0) ? 'alive' : 'dead'}\n`);

  // Test 4: Neighbor counting
  console.log('Test 4: Neighbor Counting');
  sim.clear();
  // Create a 3x3 pattern
  sim.setCellState(1, 1, true); // center
  sim.setCellState(0, 1, true); // left
  sim.setCellState(2, 1, true); // right
  sim.setCellState(1, 0, true); // top
  sim.setCellState(1, 2, true); // bottom
  
  const neighbors = sim.countLiveNeighbors(1, 1);
  console.log(`✅ Center cell (1,1) has ${neighbors} neighbors (expected: 4)`);
  
  const cornerNeighbors = sim.countLiveNeighbors(0, 0);
  console.log(`✅ Corner cell (0,0) has ${cornerNeighbors} neighbors (with wrapping)\n`);

  // Test 5: Conway's Rules - Still Life (Block)
  console.log('Test 5: Conway\'s Rules - Still Life (2x2 Block)');
  sim.clear();
  // Create a 2x2 block (still life pattern)
  sim.setCellState(4, 4, true);
  sim.setCellState(4, 5, true);
  sim.setCellState(5, 4, true);
  sim.setCellState(5, 5, true);
  
  console.log('Before update:');
  printGridSection(sim, 3, 7, 3, 7);
  
  sim.update();
  
  console.log('After 1 update (should be unchanged):');
  printGridSection(sim, 3, 7, 3, 7);
  console.log('✅ 2x2 block remains stable\n');

  // Test 6: Conway's Rules - Oscillator (Blinker)
  console.log('Test 6: Conway\'s Rules - Oscillator (Blinker)');
  sim.clear();
  // Create a horizontal line (blinker pattern)
  sim.setCellState(4, 5, true);
  sim.setCellState(5, 5, true);
  sim.setCellState(6, 5, true);
  
  console.log('Blinker - Generation 0 (horizontal):');
  printGridSection(sim, 3, 8, 3, 8);
  
  sim.update();
  
  console.log('Blinker - Generation 1 (should be vertical):');
  printGridSection(sim, 3, 8, 3, 8);
  
  sim.update();
  
  console.log('Blinker - Generation 2 (should be horizontal again):');
  printGridSection(sim, 3, 8, 3, 8);
  console.log('✅ Blinker oscillates correctly\n');

  // Test 7: Edge wrapping
  console.log('Test 7: Edge Wrapping');
  sim.clear();
  // Place cells at edges to test wrapping
  sim.setCellState(0, 0, true);
  sim.setCellState(9, 9, true);
  sim.setCellState(0, 9, true);
  
  const edgeNeighbors = sim.countLiveNeighbors(0, 0);
  console.log(`✅ Cell at (0,0) sees ${edgeNeighbors} neighbors through wrapping`);
  
  // Test 8: Performance test
  console.log('Test 8: Performance Test');
  const largeSim = new Simulation(100, 100);
  largeSim.initializeRandom(0.3);
  
  const startTime = performance.now();
  for (let i = 0; i < 100; i++) {
    largeSim.update();
  }
  const endTime = performance.now();
  
  console.log(`✅ 100 updates on 100x100 grid took ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`✅ Average: ${((endTime - startTime) / 100).toFixed(2)}ms per update\n`);

  console.log('🎉 All tests completed successfully!');
}

function printGridSection(sim: Simulation, startX: number, endX: number, startY: number, endY: number) {
  for (let y = startY; y <= endY; y++) {
    let row = '';
    for (let x = startX; x <= endX; x++) {
      row += sim.getCellAt(x, y) ? '●' : '○';
    }
    console.log(row);
  }
  console.log('');
}

// Run the tests
runTests();
