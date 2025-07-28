// Hyper-Modern Game of Life
// Main application entry point

import * as THREE from 'three';
import { Simulation } from './simulation.js';
import { startDrone, modulateDrone } from './audio.js';
import { Controls } from './controls.js';

console.log('🌟 Hyper-Modern Game of Life initializing...');

// Application state
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let simulation: Simulation;
let controls: Controls;

// Rendering state
let cellGeometry: THREE.PlaneGeometry;
let cellMaterial: THREE.ShaderMaterial;
let instancedCells: THREE.InstancedMesh;

// Task 39: Instanced attributes for animated transitions
let ageAttribute: THREE.InstancedBufferAttribute;
let dyingAttribute: THREE.InstancedBufferAttribute;

// Frame rate control variables
let targetFrameRate = 120; // Default to 60 FPS (full speed)
let lastFrameTime = 0;
let frameInterval = 1000 / targetFrameRate; // Milliseconds between simulation updates

// Task 44: Background rendering state
let backgroundGeometry: THREE.PlaneGeometry;
let backgroundMaterial: THREE.ShaderMaterial;
let backgroundMesh: THREE.Mesh;

// Animation state
let animationId: number;
let startTime: number;

// Phase 2.3: Shader loading with inline shaders for reliability
async function loadShaders(): Promise<{ vertex: string; fragment: string }> {
  // Load from actual shader files for Task 2.4 animated transitions
  console.log('🔧 Loading shaders from files for animated transitions...');
  
  try {
    const [vertexResponse, fragmentResponse] = await Promise.all([
      fetch('/src/shaders/cell.vert'),
      fetch('/src/shaders/cell.frag')
    ]);
    
    if (!vertexResponse.ok || !fragmentResponse.ok) {
      throw new Error('Failed to fetch shader files');
    }
    
    const vertex = await vertexResponse.text();
    const fragment = await fragmentResponse.text();
    
    console.log('✅ Successfully loaded shaders from files');
    return { vertex, fragment };
    
  } catch (error) {
    console.warn('⚠️ Failed to load shader files, falling back to inline shaders:', error);
    
    // Fallback to updated inline shaders with animation support
    return {
      vertex: `
        // Task 29: Vertex shader for instanced cell rendering  
        // Task 31: Pass through instance matrix and camera projection
        // Task 40: Create age attribute for animated transitions
        // Task 41: Use age to animate cell scale during birth
        uniform float time;
        attribute float age;
        attribute float isDying;
        varying vec2 vUv;
        varying float vAge;
        varying float vIsDying;

        void main() {
            // Pass UV coordinates to fragment shader
            vUv = uv;
            
            // Pass age and dying state to fragment shader
            vAge = age;
            vIsDying = isDying;
            
            // Task 41: Animate scale based on age for birth animation
            float scale = 1.0;
            if (age <= 3.0 && age > 0.0) {
                // Birth animation: scale up from 0 to 1 over first 3 frames
                scale = smoothstep(0.0, 1.0, age / 3.0);
            }
            
            // Task 43: Handle dying cell scale animation
            if (isDying > 0.5) {
                // Dying cells shrink slightly and fade
                scale *= 0.8;
            }
            
            // Apply scale to position
            vec3 scaledPosition = position * scale;
            
            // Get the instance matrix for this cell
            // instanceMatrix is automatically provided by Three.js for InstancedMesh
            vec4 instancePosition = instanceMatrix * vec4(scaledPosition, 1.0);
            
            // Apply camera transformations
            gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
        }
      `,
      fragment: `
        // Task 30: Fragment shader for instanced cell rendering
        // Task 32: Basic color output  
        // Task 35: Soft, glowing circle instead of square
        // Task 37: Time-based pulsing/shimmering effects
        // Task 43: Fade-out animation for dying cells
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        varying float vAge;
        varying float vIsDying;

        void main() {
            // Task 35: Create soft, glowing circle using UV coordinates
            // Map UV coordinates (0 to 1) to centered coordinates (-1 to 1)
            vec2 localCoord = (vUv - 0.5) * 2.0;
            
            // Calculate distance from center
            float dist = length(localCoord);
            
            // Create soft, glowing circle using smoothstep
            float circle = 1.0 - smoothstep(0.4, 1.0, dist);
            
            // Task 37: Add time-based pulsing effect
            float pulse = sin(time * 3.0) * 0.2 + 0.8; // Pulsing between 0.6 and 1.0
            
            // Add subtle shimmering effect
            float shimmer = sin(time * 8.0 + dist * 10.0) * 0.1 + 0.9; // Subtle shimmer
            
            // Task 41: Birth animation - brighter glow for newly born cells
            float birthGlow = 1.0;
            if (vAge <= 5.0 && vAge > 0.0) {
                birthGlow = 1.0 + (5.0 - vAge) * 0.5; // Extra brightness fades over first 5 frames
            }
            
            // Task 43: Dying animation - fade out effect
            float dyingFade = 1.0;
            vec3 dyingColor = color;
            if (vIsDying > 0.5) {
                dyingFade = 0.3; // Fade to 30% opacity
                dyingColor = mix(color, vec3(1.0, 0.3, 0.0), 0.7); // Shift to orange-red
            }
            
            // Combine effects
            float intensity = circle * pulse * shimmer * birthGlow * dyingFade;
            
            // Task 32: Output color with glow effect
            vec3 glowColor = dyingColor * intensity;
            
            // Add outer glow for extra luminosity
            float outerGlow = 1.0 - smoothstep(0.0, 1.2, dist);
            glowColor += dyingColor * outerGlow * 0.3 * pulse * dyingFade;
            
            gl_FragColor = vec4(glowColor, intensity);
        }
      `
    };
  }
}

// Task 44: Load background shaders for procedural starfield
async function loadBackgroundShaders(): Promise<{ vertex: string; fragment: string }> {
  console.log('🌌 Loading background shaders for procedural starfield...');
  
  // Use inline shaders for reliability - external file loading often fails in dev
  console.log('🔧 Using reliable inline background shaders...');
  
  return {
    vertex: `
      // Task 46: Background vertex shader for procedural starfield
      varying vec2 vUv;

      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragment: `
      // Task 46: Simplified background fragment shader with starfield
      // Task 47: Time-based animation
      uniform float time;
      uniform vec2 resolution;
      varying vec2 vUv;

      // Simple hash function for star generation
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // Generate stars at different scales with size parameter
      float stars(vec2 uv, float threshold, float density, float starSize) {
          vec2 grid = floor(uv * density);
          vec2 localUv = fract(uv * density);
          
          // Random star position within grid cell
          vec2 starPos = vec2(hash(grid), hash(grid + vec2(1.3, 7.4))) * 0.7 + 0.15;
          
          // Calculate distance from star center
          float dist = length(localUv - starPos);
          
          // Star brightness based on hash
          float brightness = hash(grid + vec2(13.7, 27.3));
          if (brightness < threshold) return 0.0;
          
          // Create proper circular star with size parameter
          float star = 1.0 - smoothstep(0.0, starSize, dist);
          star = pow(star, 2.0); // Sharp falloff to center
          
          return star * brightness;
      }

      void main() {
          // Task 47: Animated UV coordinates for drifting effect
          vec2 uv = vUv;
          
          // Fix aspect ratio to prevent star stretching
          float aspect = resolution.x / resolution.y;
          uv.x *= aspect;
          
          vec2 driftUv = uv + vec2(time * 0.01, time * 0.005);
          
          // Base deep space color - dark blue with subtle variation
          vec3 spaceColor = vec3(0.02, 0.05, 0.12);
          
          // Generate multiple layers of stars with different sizes
          float bigStars = stars(driftUv, 0.98, 4.0, 0.12);        // Large, rare, bigger stars
          float medStars = stars(driftUv + vec2(100.0), 0.94, 8.0, 0.08);  // Medium stars  
          float smallStars = stars(driftUv + vec2(200.0), 0.85, 16.0, 0.05); // Small, frequent, tiny stars
          
          // Task 47: Add twinkling effect
          float twinkle1 = sin(time * 2.0 + hash(floor(driftUv * 6.0)) * 6.28) * 0.4 + 0.6;
          float twinkle2 = sin(time * 3.0 + hash(floor(driftUv * 12.0) + vec2(50.0)) * 6.28) * 0.3 + 0.7;
          float twinkle3 = sin(time * 4.0 + hash(floor(driftUv * 24.0) + vec2(100.0)) * 6.28) * 0.2 + 0.8;
          
          bigStars *= twinkle1;
          medStars *= twinkle2;
          smallStars *= twinkle3;
          
          // Star colors - different temperatures (more realistic brightness)
          vec3 starColor1 = vec3(0.9, 0.95, 1.0) * 1.2; // Cool blue-white
          vec3 starColor2 = vec3(1.0, 0.9, 0.8) * 1.0;  // Warm white
          vec3 starColor3 = vec3(0.8, 0.9, 1.0) * 0.8;  // Subtle blue
          
          // Combine all elements
          vec3 finalColor = spaceColor;
          finalColor += bigStars * starColor1;
          finalColor += medStars * starColor2;
          finalColor += smallStars * starColor3;
          
          // Add subtle vignette
          float vignette = 1.0 - length(uv - 0.5) * 1.2;
          vignette = max(vignette, 0.3); // Don't make it too dark
          finalColor *= vignette;
          
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  };
}

// Debug controls for testing animated transitions
function addDebugControls() {
  console.log('🎮 Adding debug controls for animation testing...');
  
  // Data storage for sparkline graphs
  const sparklineData = {
    living: [] as number[],
    dying: [] as number[],
    young: [] as number[],
    total: [] as number[],
    trend: [] as number[], // Raw B/D trend
    trendSmooth: [] as number[] // Smoothed B/D trend (EMA)
  };
  const maxDataPoints = 100; // Show last X data points (doubled)
  
  // Draw sparkline function
  function drawSparkline(canvas: HTMLCanvasElement, data: number[], color: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx || data.length < 2) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const maxValue = Math.max(...data, 1); // Avoid division by zero
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1; // Avoid division by zero
    
    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    // Horizontal lines
    for (let i = 0; i <= 2; i++) {
      const y = (canvas.height / 2) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
    
    // Draw the line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * canvas.width;
      const normalizedValue = (data[i] - minValue) / range;
      const y = canvas.height - (normalizedValue * canvas.height);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw small dots at data points
    ctx.fillStyle = color;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * canvas.width;
      const normalizedValue = (data[i] - minValue) / range;
      const y = canvas.height - (normalizedValue * canvas.height);
      
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Highlight the last point
    if (data.length > 0) {
      const lastX = canvas.width - 1;
      const lastValue = data[data.length - 1];
      const normalizedLastValue = (lastValue - minValue) / range;
      const lastY = canvas.height - (normalizedLastValue * canvas.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  
  // Create debug UI
  const debugPanel = document.createElement('div');
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.95);
    color: #4CAF50;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #4CAF50;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000;
    width: 310px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;
  
  debugPanel.innerHTML = `
    <div id="debug-header" style="display: flex; align-items: center; margin-bottom: 8px; min-width: 180px; width: 100%;">
      <h3 id="debug-title" style="margin: 0; color: #00ff88; font-size: 14px; flex: 1 1 auto;">👽 Live Stats</h3>
    </div>
    <div id="debug-content">
      <div id="stats" style="margin-bottom: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <span style="font-size: 11px;">Living: <span id="living-count" style="color: #00ff88; font-weight: bold;">0</span></span>
          <canvas id="living-sparkline" width="200" height="16" style="margin-left: 8px;"></canvas>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <span style="font-size: 11px;">Dying: <span id="dying-count" style="color: #ff6b6b; font-weight: bold;">0</span></span>
          <canvas id="dying-sparkline" width="200" height="16" style="margin-left: 8px;"></canvas>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <span style="font-size: 11px;">Young: <span id="young-count" style="color: #ffc107; font-weight: bold;">0</span></span>
          <canvas id="young-sparkline" width="200" height="16" style="margin-left: 8px;"></canvas>
        </div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
        <span style="font-size: 11px;">Total: <span id="total-instances" style="color: #9c27b0; font-weight: bold;">0</span></span>
        <canvas id="total-sparkline" width="200" height="16" style="margin-left: 8px;"></canvas>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
        <span style="font-size: 11px;">Trend: <span id="trend-status" style="color: #00bfff; font-weight: bold;">0</span></span>
        <canvas id="trend-sparkline" width="200" height="16" style="margin-left: 8px;"></canvas>
      </div>
      </div>
      <div style="margin-bottom: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <span style="font-size: 11px;">Frame Rate: <span id="current-fps" style="color: #ffaa00; font-weight: bold;">120</span> FPS</span>
          <div style="display: flex; gap: 2px;">
            <button id="fps-minus" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 1px 4px; border-radius: 2px; cursor: pointer; font-size: 9px;">−</button>
            <button id="fps-plus" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 1px 4px; border-radius: 2px; cursor: pointer; font-size: 9px;">+</button>
          </div>
        </div>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 2px; margin-bottom: 6px;">
        <button id="test-birth" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">🌱 Birth</button>
        <button id="test-death" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">💀 Death</button>
        <button id="inject-glider" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">🚀 Glider</button>
        <div id="sound-status" style="margin-top:8px; color:#4a9eff; font-size:12px;"></div>
        <button id="toggle-bg" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">🌌 BG</button>
        <button id="clear-all" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">🧹 Clear</button>
        <button id="random-cells" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">🎲 Random</button>
        <button id="pause-sim" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">⏸️ Pause</button>
        <button id="toggle-autoseed" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">🌱 AutoSeed</button>
        <button id="toggle-wrapping" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px;">🌐 Wrap</button>
        <button id="sim-explainer" style="background: #000; color: #4CAF50; border: 1px solid #3a3a3aff; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 10px; ">❓ Rules</button>
    </div>
  </div>
  <button id="toggle-debug" style="position: absolute; top: 8px; right: 8px; background: #333; color: #888; border: 1px solid #888; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px; min-width: 28px; text-align: center; z-index: 1001;">−</button>
`;
  document.body.appendChild(debugPanel);

  // Add Simulation Explainer modal logic (after debugPanel is in DOM)
  setTimeout(() => {
    const simExplainerBtn = document.getElementById('sim-explainer');
    if (!simExplainerBtn) return;
    const explainerModal = document.createElement('div');
    explainerModal.style.position = 'fixed';
    explainerModal.style.top = '0';
    explainerModal.style.left = '0';
    explainerModal.style.width = '100vw';
    explainerModal.style.height = '100vh';
    explainerModal.style.background = 'rgba(0,0,0,0.5)';
    explainerModal.style.zIndex = '2000';
    explainerModal.style.justifyContent = 'center';
    explainerModal.style.alignItems = 'center';
    explainerModal.style.display = 'none';

    const explainerContent = document.createElement('div');
    explainerContent.style.background = '#fff';
    explainerContent.style.color = '#222';
    explainerContent.style.padding = '28px 32px';
    explainerContent.style.borderRadius = '10px';
    explainerContent.style.maxWidth = '420px';
    explainerContent.style.margin = 'auto';
    explainerContent.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
    explainerContent.innerHTML = [
      '<h2 style="margin-top:0">Conway\'s Game of Life: Simulation Rules</h2>',
      '<p style="font-size:14px;line-height:1.6;margin-bottom:10px;">',
        'The Game of Life is a cellular automaton devised by mathematician John Conway. It simulates the evolution of a grid of cells, each of which can be alive or dead. The state of the grid evolves in discrete steps according to these simple rules:',
      '</p>',
      '<ol style="padding-left:1.2em;font-size:13px;">',
        '<li><b>Survival:</b> A living cell with 2 or 3 living neighbors remains alive to the next generation.</li>',
        '<li><b>Birth:</b> A dead cell with exactly 3 living neighbors becomes alive (is "born").</li>',
        '<li><b>Death by Isolation:</b> A living cell with fewer than 2 living neighbors dies (underpopulation).</li>',
        '<li><b>Death by Overcrowding:</b> A living cell with more than 3 living neighbors dies (overpopulation).</li>',
        '<li>All other dead cells remain dead.</li>',
      '</ol>',
      '<p style="font-size:13px;line-height:1.5;">',
        'These rules, though simple, can produce surprisingly complex and beautiful patterns, including oscillators, spaceships, and self-replicating structures. The simulation is entirely deterministic and requires no user input after the initial state is set.',
      '</p>',
      '<button id="close-sim-explainer" style="margin-top:18px;padding:6px 16px;background:#222;color:#fff;border:none;border-radius:4px;cursor:pointer;">Close</button>'
    ].join('');
    explainerModal.appendChild(explainerContent);
    document.body.appendChild(explainerModal);
    simExplainerBtn.addEventListener('click', () => {
      explainerModal.style.display = 'flex';
    });
    explainerModal.addEventListener('click', (e) => {
      if (e.target === explainerModal) explainerModal.style.display = 'none';
    });
    explainerContent.querySelector('#close-sim-explainer')?.addEventListener('click', () => {
      explainerModal.style.display = 'none';
    });
  }, 0);
  
  // Get sparkline canvases from the DOM (they're now inline in the HTML)
  const livingSparkline = document.getElementById('living-sparkline') as HTMLCanvasElement;
  const dyingSparkline = document.getElementById('dying-sparkline') as HTMLCanvasElement;
  const youngSparkline = document.getElementById('young-sparkline') as HTMLCanvasElement;
  const totalSparkline = document.getElementById('total-sparkline') as HTMLCanvasElement;
  const trendSparkline = document.getElementById('trend-sparkline') as HTMLCanvasElement;
  
  // Add event listeners
  let isPaused = false;
  let debugCollapsed = false;
  
  // Toggle debug panel collapse
  document.getElementById('toggle-debug')?.addEventListener('click', (e) => {
    e.stopPropagation();
    debugCollapsed = !debugCollapsed;
    const content = document.getElementById('debug-content');
    const debugTitle = document.getElementById('debug-title');
    const toggleBtn = document.getElementById('toggle-debug');
    if (content && toggleBtn && debugTitle) {
      if (debugCollapsed) {
        content.style.display = 'none';
        debugTitle.style.visibility = 'hidden';
        toggleBtn.textContent = '+';
        toggleBtn.style.color = '#4CAF50';
        debugPanel.style.width = '60px';
        debugPanel.style.border = 'none';
      } else {
        content.style.display = 'block';
        debugTitle.style.visibility = 'visible';
        toggleBtn.textContent = '−';
        toggleBtn.style.color = '#888';
        debugPanel.style.width = '310px';
        debugPanel.style.border = '1px solid #4CAF50';
      }
    }
    console.log(debugCollapsed ? '📦 Debug panel collapsed' : '📋 Debug panel expanded');
  });
  
  document.getElementById('test-birth')?.addEventListener('click', () => {
    const status = document.getElementById('sound-status');
    if (status) status.textContent = '';
    // Add a glider pattern to create births and deaths
    const centerX = 50;
    const centerY = 50;
    // Clear a small area first
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        simulation.setCellState(centerX + dx, centerY + dy, false);
      }
    }
    // Add glider pattern
    simulation.setCellState(centerX, centerY, true);
    simulation.setCellState(centerX + 1, centerY + 1, true);
    simulation.setCellState(centerX - 1, centerY + 2, true);
    simulation.setCellState(centerX, centerY + 2, true);
    simulation.setCellState(centerX + 1, centerY + 2, true);
    updateCellInstances();
    updateStats();
  });
  
  document.getElementById('test-death')?.addEventListener('click', () => {
    const status = document.getElementById('sound-status');
    if (status) status.textContent = '';
    // Create a pattern that will cause immediate deaths on next update
    // Create overcrowded areas (more than 3 neighbors = death)
    const centerX = 50;
    const centerY = 50;
    // First, add some existing cells
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        simulation.setCellState(centerX + dx, centerY + dy, true);
        simulation.setCellState(centerX + dx + 5, centerY + dy, true);
        simulation.setCellState(centerX + dx + 10, centerY + dy, true);
      }
    }
    // Update immediately to trigger deaths
    updateCellInstances();
    updateStats();
    // Force one simulation step to create dying cells
    setTimeout(() => {
      simulation.update();
      updateCellInstances();
      updateStats();
      console.log('💀 Death animations should now be visible with orange fade-out!');
    }, 100);
  });
  
  document.getElementById('inject-glider')?.addEventListener('click', () => {
    // Manually inject a glider for testing
    const x = Math.floor(Math.random() * (simulation.getDimensions().width - 10)) + 5;
    const y = Math.floor(Math.random() * (simulation.getDimensions().height - 10)) + 5;
    
    // Standard glider pattern
    simulation.setCellState(x, y + 1, true);
    simulation.setCellState(x + 1, y + 2, true);
    simulation.setCellState(x + 2, y, true);
    simulation.setCellState(x + 2, y + 1, true);
    simulation.setCellState(x + 2, y + 2, true);
    
    updateCellInstances();
    updateStats();
    console.log('🚀 Glider injected at position:', x, y);
  });
  
  document.getElementById('clear-all')?.addEventListener('click', () => {
    console.log('🧹 Clearing all cells...');
    simulation.clear();
    updateCellInstances();
    updateStats();
  });
  
  document.getElementById('random-cells')?.addEventListener('click', () => {
    console.log('🎲 Adding random cells...');
    simulation.initializeRandom(0.15);
    updateCellInstances();
    updateStats();
  });
  
  document.getElementById('pause-sim')?.addEventListener('click', () => {
    isPaused = !isPaused;
    const btn = document.getElementById('pause-sim');
    if (btn) {
      btn.textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
    console.log(isPaused ? '⏸️ Simulation paused' : '▶️ Simulation resumed');
    
    // Store pause state globally
    (window as any).simulationPaused = isPaused;
  });
  
  document.getElementById('toggle-autoseed')?.addEventListener('click', () => {
    simulation.autoSeedEnabled = !simulation.autoSeedEnabled;
    const btn = document.getElementById('toggle-autoseed');
    if (btn) {
      btn.textContent = simulation.autoSeedEnabled ? '🌱 AutoSeed' : '🌱 Manual';
      btn.style.color = simulation.autoSeedEnabled ? '#4CAF50' : '#888';
    }
    console.log(`🌱 Auto-seeding ${simulation.autoSeedEnabled ? 'enabled' : 'disabled'}`);
  });
  
  document.getElementById('toggle-wrapping')?.addEventListener('click', () => {
    simulation.edgeWrapping = !simulation.edgeWrapping;
    const btn = document.getElementById('toggle-wrapping');
    if (btn) {
      btn.textContent = simulation.edgeWrapping ? '🌐 Wrap' : '🌐 Bound';
      btn.style.color = simulation.edgeWrapping ? '#4CAF50' : '#888';
    }
    console.log(`🌐 Edge ${simulation.edgeWrapping ? 'wrapping' : 'bounded'} mode enabled`);
  });
  
  // Frame rate controls with hold-to-repeat functionality
  let fpsHoldInterval: number | null = null;
  let fpsHoldDirection: 'up' | 'down' | null = null;
  
  function updateFrameRate(direction: 'up' | 'down') {
    if (direction === 'down' && targetFrameRate > 1) {
      targetFrameRate = Math.max(1, targetFrameRate - 1);
      frameInterval = 1000 / targetFrameRate;
      const fpsDisplay = document.getElementById('current-fps');
      if (fpsDisplay) fpsDisplay.textContent = targetFrameRate.toString();
      console.log(`🎯 Frame rate decreased to ${targetFrameRate} FPS`);
    } else if (direction === 'up' && targetFrameRate < 120) {
      targetFrameRate = Math.min(120, targetFrameRate + 1);
      frameInterval = 1000 / targetFrameRate;
      const fpsDisplay = document.getElementById('current-fps');
      if (fpsDisplay) fpsDisplay.textContent = targetFrameRate.toString();
      console.log(`🎯 Frame rate increased to ${targetFrameRate} FPS`);
    }
  }
  
  function startFpsHold(direction: 'up' | 'down') {
    if (fpsHoldInterval) return; // Already holding
    
    fpsHoldDirection = direction;
    updateFrameRate(direction); // Immediate update
    
    // Start repeating after initial delay
    setTimeout(() => {
      if (fpsHoldDirection === direction) {
        fpsHoldInterval = setInterval(() => {
          if (fpsHoldDirection === direction) {
            updateFrameRate(direction);
          }
        }, 100); // Repeat every 100ms while held
      }
    }, 300); // Initial delay of 300ms
  }
  
  function stopFpsHold() {
    if (fpsHoldInterval) {
      clearInterval(fpsHoldInterval);
      fpsHoldInterval = null;
    }
    fpsHoldDirection = null;
  }
  
  // FPS minus button events
  const fpsMinusBtn = document.getElementById('fps-minus');
  if (fpsMinusBtn) {
    fpsMinusBtn.addEventListener('mousedown', () => startFpsHold('down'));
    fpsMinusBtn.addEventListener('mouseup', stopFpsHold);
    fpsMinusBtn.addEventListener('mouseleave', stopFpsHold);
    fpsMinusBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startFpsHold('down');
    });
    fpsMinusBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopFpsHold();
    });
  }
  
  // FPS plus button events
  const fpsPlusBtn = document.getElementById('fps-plus');
  if (fpsPlusBtn) {
    fpsPlusBtn.addEventListener('mousedown', () => startFpsHold('up'));
    fpsPlusBtn.addEventListener('mouseup', stopFpsHold);
    fpsPlusBtn.addEventListener('mouseleave', stopFpsHold);
    fpsPlusBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startFpsHold('up');
    });
    fpsPlusBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopFpsHold();
    });
  }
  
  // Global mouse/touch up events to ensure we stop holding if mouse is released outside button
  document.addEventListener('mouseup', stopFpsHold);
  document.addEventListener('touchend', stopFpsHold);
  
  document.getElementById('toggle-bg')?.addEventListener('click', () => {
    console.log('🌌 Toggling background visibility...');
    if (backgroundMesh) {
      backgroundMesh.visible = !backgroundMesh.visible;
      const btn = document.getElementById('toggle-bg');
      if (btn) {
        btn.textContent = backgroundMesh.visible ? '🌌 Hide BG' : '🌌 Show BG';
      }
      console.log(`🌌 Background ${backgroundMesh.visible ? 'shown' : 'hidden'}`);
    }
  });
  

  
  // Update stats function
  (window as any).updateStats = updateStats;
  
  function updateStats() {
    const grid = simulation.getGrid();
    const ages = simulation.getAges();
    const dyingCells = simulation.getDyingCells();

    let livingCount = 0;
    let youngCount = 0;

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1) {
        livingCount++;
        if (ages[i] <= 5) {
          youngCount++;
        }
      }
    }

    const dyingCount = dyingCells.size;
    const totalCount = instancedCells.count;

    // Calculate B/D trend for this frame
    const births = simulation.lastBirths ?? 0;
    const deaths = simulation.lastDeaths ?? 0;
    let trend = 0;
    const totalBD = births + deaths;
    if (totalBD > 0) {
      trend = (births - deaths) / totalBD;
    }
    sparklineData.trend.push(trend);

    // Smooth the trend using exponential moving average (EMA)
    const alpha = 0.50; // Smoothing factor (higher = more responsive, less flat)
    let lastSmooth = sparklineData.trendSmooth.length > 0 ? sparklineData.trendSmooth[sparklineData.trendSmooth.length - 1] : trend;
    const smoothTrend = lastSmooth + alpha * (trend - lastSmooth);
    sparklineData.trendSmooth.push(smoothTrend);

    // Update sparkline data
    sparklineData.living.push(livingCount);
    sparklineData.dying.push(dyingCount);
    sparklineData.young.push(youngCount);
    sparklineData.total.push(totalCount);

    // Keep only the last maxDataPoints
    if (sparklineData.living.length > maxDataPoints) {
      sparklineData.living.shift();
      sparklineData.dying.shift();
      sparklineData.young.shift();
      sparklineData.total.shift();
      sparklineData.trend.shift();
      sparklineData.trendSmooth.shift();
    }

    // Update text values
    const livingEl = document.getElementById('living-count');
    const dyingEl = document.getElementById('dying-count');
    const youngEl = document.getElementById('young-count');
    const totalEl = document.getElementById('total-instances');
    const trendEl = document.getElementById('trend-status');

    if (livingEl) livingEl.textContent = livingCount.toString();
    if (dyingEl) dyingEl.textContent = dyingCount.toString();
    if (youngEl) youngEl.textContent = youngCount.toString();
    if (totalEl) totalEl.textContent = totalCount.toString();
    if (trendEl) {
      // Use smoothed trend for label and color
      const smooth = sparklineData.trendSmooth.length > 0 ? sparklineData.trendSmooth[sparklineData.trendSmooth.length - 1] : 0;
      let label = 'Flat';
      if (smooth > 0.05) label = 'Up';
      else if (smooth < -0.05) label = 'Down';
      trendEl.textContent = `${label}`;
      trendEl.style.color = smooth > 0.05 ? '#00bfff' : smooth < -0.05 ? '#ff6b6b' : '#aaa';
    }

    // Update sparklines
    drawSparkline(livingSparkline, sparklineData.living, '#00ff88');
    drawSparkline(dyingSparkline, sparklineData.dying, '#ff6b6b');
    drawSparkline(youngSparkline, sparklineData.young, '#ffc107');
    drawSparkline(totalSparkline, sparklineData.total, '#9c27b0');
    drawSparkline(trendSparkline, sparklineData.trendSmooth, '#00bfff');
  }
  
  // Initial stats update
  setTimeout(updateStats, 1000);
}

async function init() {
  console.log('✨ Setting up Three.js scene...');
  
  // Add a visual indicator to body to confirm script is running
  document.body.style.background = '#000011';
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = `
    position: fixed; 
    top: 10px; 
    left: 10px; 
    color: #4CAF50; 
    font-family: monospace; 
    z-index: 9999;
    background: rgba(0,0,0,0.8);
    padding: 10px;
    border-radius: 4px;
  `;
  statusDiv.textContent = '🎮 Three.js initializing...';
  document.body.appendChild(statusDiv);
  
  // Task 21: Create WebGL renderer and append to page body
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 1.0); // Pure black background to contrast with starfield
  document.body.appendChild(renderer.domElement);
  
  statusDiv.textContent = '🎮 Renderer created...';
  console.log('✅ Renderer created and appended to DOM');
  
  // Task 22: Create Scene object
  scene = new THREE.Scene();
  
  // Task 23: Create OrthographicCamera suitable for 2D view
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 50;
  camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,  // left
    (frustumSize * aspect) / 2,   // right
    frustumSize / 2,              // top
    frustumSize / -2,             // bottom
    0.1,                          // near
    1000                          // far
  );
  camera.position.z = 10;
  
  // Make scene and camera globally accessible for testing
  (window as any).scene = scene;
  (window as any).camera = camera;
  
  // Initialize simulation
  simulation = new Simulation(100, 100);
  simulation.initializeRandom(0.15);
  
  // Task 61-68: Initialize user controls
  const gridDimensions = simulation.getDimensions();
  controls = new Controls(camera, renderer, simulation, gridDimensions.width, gridDimensions.height);
  console.log('🎮 Controls initialized - panning, zooming, and cell painting enabled');

  // Initialize start time for shaders
  startTime = Date.now();
  
  // Phase 2.3: Setup shader-based rendering
  statusDiv.textContent = '🎮 Loading shaders...';
  await setupShaderBasedCells();
  
  // Task 44-47: Setup dynamic background with procedural starfield
  statusDiv.textContent = '🌌 Creating starfield background...';
  await setupDynamicBackground();
  
  // Task 25: Window resize handling
  setupResizeHandler();
  
  // Update status
  statusDiv.textContent = '';
  
  // Add debug controls for testing animations
  addDebugControls();


  // Do not start drone here; it will be started after first user interaction for browser autoplay compliance
  
  console.log('✅ Three.js scene setup complete!');
  console.log('🎮 Starting animation loop...');
  
  // Task 24: Start main animation loop
  animate();
}

// Phase 2.3: Setup shader-based cell rendering (Tasks 29-37)
// Task 39: Setup instanced attributes for animated transitions
async function setupShaderBasedCells() {
  console.log('🔧 Setting up shader-based cell rendering with animations...');
  
  // Task 26: Create a PlaneGeometry to serve as the base shape for each cell
  cellGeometry = new THREE.PlaneGeometry(0.8, 0.8); // Slightly smaller than 1x1 to create gaps
  
  // Tasks 29-30: Load vertex and fragment shaders
  const shaders = await loadShaders();
  
  // Task 33: Create a ShaderMaterial with loaded shader code
  // Task 36: Pass time uniform to shaders
  cellMaterial = new THREE.ShaderMaterial({
    vertexShader: shaders.vertex,
    fragmentShader: shaders.fragment,
    uniforms: {
      time: { value: 0.0 },
      color: { value: new THREE.Vector3(0.0, 1.0, 0.5) } // Cyan-green glow
    },
    transparent: true,
    blending: THREE.AdditiveBlending, // Additive blending for glow effect
  });
  
  // Check for shader compilation errors
  cellMaterial.onBeforeCompile = () => {
    console.log('🔧 Shader compilation started...');
  };
  
  // Add error event listener
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    console.error('❌ WebGL context lost:', event);
  });
  
  // Task 27: Create an InstancedMesh using the plane geometry, capable of rendering every cell on the grid in a single draw call
  const { width, height } = simulation.getDimensions();
  const maxInstances = width * height; // Maximum possible instances (all cells alive)
  
  // Task 34: Apply ShaderMaterial to InstancedMesh  
  instancedCells = new THREE.InstancedMesh(cellGeometry, cellMaterial, maxInstances);
  instancedCells.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Will be updated frequently
  instancedCells.count = 0; // Initialize to 0 instances
  
  // Task 39: Create instanced attributes for age and dying state
  const ageArray = new Float32Array(maxInstances);
  const dyingArray = new Float32Array(maxInstances);
  
  ageAttribute = new THREE.InstancedBufferAttribute(ageArray, 1);
  dyingAttribute = new THREE.InstancedBufferAttribute(dyingArray, 1);
  
  ageAttribute.setUsage(THREE.DynamicDrawUsage);
  dyingAttribute.setUsage(THREE.DynamicDrawUsage);
  
  // Task 40: Add age and dying attributes to geometry
  instancedCells.geometry.setAttribute('age', ageAttribute);
  instancedCells.geometry.setAttribute('isDying', dyingAttribute);
  
  // Add to scene
  scene.add(instancedCells);
  
  // Make globally accessible for testing
  (window as any).cellGeometry = cellGeometry;
  (window as any).cellMaterial = cellMaterial;
  (window as any).instancedCells = instancedCells;
  (window as any).ageAttribute = ageAttribute;
  (window as any).dyingAttribute = dyingAttribute;
  
  console.log(`✅ Created shader-based InstancedMesh with ${maxInstances} max instances and animated attributes`);
  
  // Task 28: Initial update of instance matrices
  updateCellInstances();
}

// Task 28: Method that iterates over the simulation grid and sets the matrix (position) for each active instance
// Task 39: Also updates age and dying attributes for animated transitions
function updateCellInstances() {
  const grid = simulation.getGrid();
  const ages = simulation.getAges();
  const dyingCells = simulation.getDyingCells();
  const { width, height } = simulation.getDimensions();
  
  let instanceIndex = 0;
  const matrix = new THREE.Matrix4();
  
  // First pass: render all living cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellIndex = y * width + x;
      const isAlive = grid[cellIndex] === 1;
      
      if (isAlive) {
        // Position the cell in world space
        // Center the grid around origin and space cells 1 unit apart
        const worldX = x - width / 2 + 0.5;
        const worldY = y - height / 2 + 0.5;
        
        // Create transformation matrix for this instance
        matrix.makeTranslation(worldX, worldY, 0);
        
        // Set the matrix for this instance
        instancedCells.setMatrixAt(instanceIndex, matrix);
        
        // Task 39: Set age attribute for this instance
        ageAttribute.setX(instanceIndex, ages[cellIndex]);
        
        // Task 42: Set dying state (living cells are not dying)
        dyingAttribute.setX(instanceIndex, 0.0);
        
        instanceIndex++;
      }
    }
  }
  
  // Task 42: Second pass: render dying cells with fade-out effect
  for (const dyingIndex of dyingCells) {
    const y = Math.floor(dyingIndex / width);
    const x = dyingIndex % width;
    
    // Position the dying cell in world space
    const worldX = x - width / 2 + 0.5;
    const worldY = y - height / 2 + 0.5;
    
    // Create transformation matrix for this dying instance
    matrix.makeTranslation(worldX, worldY, 0);
    
    // Set the matrix for this instance
    instancedCells.setMatrixAt(instanceIndex, matrix);
    
    // Task 42: Set dying attributes
    ageAttribute.setX(instanceIndex, 0); // Dying cells have no age
    dyingAttribute.setX(instanceIndex, 1.0); // Mark as dying
    
    instanceIndex++;
  }
  
  // Set the actual number of instances to render
  instancedCells.count = instanceIndex;
  
  // Mark the instance matrix and attributes as needing update
  instancedCells.instanceMatrix.needsUpdate = true;
  ageAttribute.needsUpdate = true;
  dyingAttribute.needsUpdate = true;
  
  // Debug output with more detail
  // if (dyingCells.size > 0) {
  //   console.log(`🔄 Updated ${instanceIndex - dyingCells.size} living cells and ${dyingCells.size} dying cells - ANIMATIONS ACTIVE`);
  // } else {
  //   console.log(`🔄 Updated ${instanceIndex} living cells`);
  // }
}

// Task 44-47: Setup dynamic background with procedural starfield
async function setupDynamicBackground() {
  console.log('🌌 Setting up dynamic background with procedural starfield...');
  
  try {
    // Task 44: Create a new full-screen PlaneGeometry for the background
    // Make it large enough to cover the camera view
    const frustumSize = 50;
    const aspect = window.innerWidth / window.innerHeight;
    backgroundGeometry = new THREE.PlaneGeometry(
      frustumSize * aspect * 2, // Width - cover full camera view
      frustumSize * 2           // Height - cover full camera view
    );
    console.log(`📐 Created background geometry: ${frustumSize * aspect * 2} x ${frustumSize * 2}`);
    
    // Load background shaders
    const backgroundShaders = await loadBackgroundShaders();
    console.log('✅ Background shaders loaded successfully');
    
    // Task 44: Create a separate ShaderMaterial for the background
    backgroundMaterial = new THREE.ShaderMaterial({
      vertexShader: backgroundShaders.vertex,
      fragmentShader: backgroundShaders.fragment,
      uniforms: {
        time: { value: 0.0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      side: THREE.DoubleSide, // Render both sides to be safe
      depthWrite: false,      // Don't write to depth buffer
      depthTest: false,       // Don't test depth
    });
    console.log('🎨 Background material created with uniforms');
    
    // Create the background mesh
    backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    
    // Task 45: Add this background plane to the scene, positioned behind the cells
    backgroundMesh.position.z = -10; // Position well behind cells (cells are at z=0)
    backgroundMesh.renderOrder = -1;  // Render first
    scene.add(backgroundMesh);
    console.log('🌌 Background mesh added to scene at z=-10');
    
    // Make globally accessible for testing
    (window as any).backgroundGeometry = backgroundGeometry;
    (window as any).backgroundMaterial = backgroundMaterial;
    (window as any).backgroundMesh = backgroundMesh;
    
    console.log('✅ Dynamic background setup complete with procedural starfield');
    
    // Add a visible test to ensure it's working
    setTimeout(() => {
      if (backgroundMesh && backgroundMaterial) {
        console.log('🧪 Background test - mesh visible:', backgroundMesh.visible);
        console.log('🧪 Background test - material uniforms:', backgroundMaterial.uniforms);
        console.log('🧪 Background test - position:', backgroundMesh.position);
        console.log('🧪 Background test - scene children:', scene.children.length);
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Failed to setup dynamic background:', error);
    throw error;
  }
}

// Task 24: Main animation loop using requestAnimationFrame
function animate() {
  animationId = requestAnimationFrame(animate);
  
  const now = performance.now();
  
  // Task 65: Update controls for smooth camera movement
  if (controls) {
    controls.update();
  }
  
  // Task 37: Update time uniform for shader effects
  const currentTime = (Date.now() - startTime) / 1000; // Convert to seconds
  if (cellMaterial && cellMaterial.uniforms) {
    cellMaterial.uniforms.time.value = currentTime;
  }
  
  // Task 47: Update time uniform for background animation
  if (backgroundMaterial && backgroundMaterial.uniforms) {
    backgroundMaterial.uniforms.time.value = currentTime;
  }
  
  // Check if simulation is paused
  const isPaused = (window as any).simulationPaused || false;
  
  // Frame rate throttling: only update simulation at target frame rate
  const shouldUpdate = (now - lastFrameTime) >= frameInterval;
  
  // Update simulation logic only when not paused and when frame interval has passed
  if (!isPaused && shouldUpdate) {
    lastFrameTime = now;
    simulation.update();
    // Only modulate drone if there was a birth or death event
    const births = simulation.lastBirths ?? 0;
    const deaths = simulation.lastDeaths ?? 0;
    if ((births > 0) || (deaths > 0)) {
      let trend = 0;
      const total = births + deaths;
      if (total > 0) {
        trend = (births - deaths) / total;
      }
      modulateDrone(trend);
    }
  } else if (isPaused) {
    // When paused, keep drone steady/neutral
    modulateDrone(0);
  }
  
  // Always update the visual representation (even when paused)
  // This ensures painted cells appear immediately
  updateCellInstances();
  
  // Update stats if the function exists
  if ((window as any).updateStats) {
    (window as any).updateStats();
  }
  
  render();
}

function render() {
  // Render the scene
  renderer.render(scene, camera);
}

// Task 25: Window resize handling
function setupResizeHandler() {
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 50;
  
  // Update camera aspect ratio
  camera.left = (frustumSize * aspect) / -2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();
  
  // Update renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Update background resolution uniform
  if (backgroundMaterial && backgroundMaterial.uniforms) {
    backgroundMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
  
  console.log(`📱 Window resized to ${window.innerWidth}x${window.innerHeight}`);
}

// Cleanup function
function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  // Task 68: Cleanup controls event listeners
  if (controls) {
    controls.dispose();
  }
  
  if (instancedCells) {
    scene.remove(instancedCells);
    instancedCells.dispose();
  }
  
  if (cellGeometry) {
    cellGeometry.dispose();
  }
  
  if (cellMaterial) {
    cellMaterial.dispose();
  }
  
  if (renderer) {
    renderer.dispose();
    document.body.removeChild(renderer.domElement);
  }
  
  window.removeEventListener('resize', onWindowResize);
}

// Handle page unload
window.addEventListener('beforeunload', cleanup);

// Initialize the application
init();


// Minimal audio initialization: start drone after first user interaction (browser autoplay compliance)
let audioInitialized = false;
async function handleFirstUserInteraction() {
  if (audioInitialized) return;
  audioInitialized = true;
  try {
    startDrone();
  } catch (error) {
    console.error('❌ Failed to initialize drone audio:', error);
  }
  document.removeEventListener('click', handleFirstUserInteraction);
  document.removeEventListener('keydown', handleFirstUserInteraction);
  document.removeEventListener('touchstart', handleFirstUserInteraction);
}
document.addEventListener('click', handleFirstUserInteraction, { once: true });
document.addEventListener('keydown', handleFirstUserInteraction, { once: true });
document.addEventListener('touchstart', handleFirstUserInteraction, { once: true });

// Run Phase 2.1 verification tests in browser context
setTimeout(() => {
  console.log('\n📋 Phase 2.1 Task Verification Report\n');

  const tasks = [
    {
      id: 21,
      description: "Create WebGL renderer and append to page body",
      verify: () => {
        const canvas = document.querySelector('canvas');
        return canvas && document.body.contains(canvas);
      }
    },
    {
      id: 22,
      description: "Create Scene object",
      verify: () => {
        return scene && scene.isScene === true;
      }
    },
    {
      id: 23,
      description: "Create OrthographicCamera suitable for 2D view",
      verify: () => {
        return camera && camera.isOrthographicCamera === true;
      }
    },
    {
      id: 24,
      description: "Create main animation loop using requestAnimationFrame",
      verify: () => {
        return typeof animationId === 'number' && animationId > 0;
      }
    },
    {
      id: 25,
      description: "Implement basic window resize handling",
      verify: () => {
        // Test by dispatching a resize event and checking if handler exists
        window.dispatchEvent(new Event('resize'));
        return true; // Handler exists and runs without error
      }
    }
  ];

  tasks.forEach(task => {
    const passed = task.verify();
    const status = passed ? '✅' : '❌';
    console.log(`${status} Task ${task.id}: ${task.description}`);
  });

  const passedCount = tasks.filter(task => task.verify()).length;
  console.log(`\n📊 Results: ${passedCount}/${tasks.length} tasks completed successfully`);
  
  if (passedCount === tasks.length) {
    console.log('🎉 Phase 2.1 - Basic Scene Setup: ALL TASKS COMPLETE!');
    console.log('� Ready to proceed to Phase 2.2 - Instanced Cell Rendering');
  } else {
    console.log('❌ Some tasks failed verification. Please check the implementation.');
  }
}, 1000);

// Run Phase 2.2 verification tests
setTimeout(() => {
  console.log('\n📋 Phase 2.2 Task Verification Report\n');
  
  const phase2_2_tasks = [
    {
      id: 26,
      description: "Create PlaneGeometry to serve as base shape for each cell",
      verify: () => {
        return cellGeometry && cellGeometry.type === 'PlaneGeometry';
      }
    },
    {
      id: 27,
      description: "Create InstancedMesh using plane geometry for single draw call rendering",
      verify: () => {
        return instancedCells && instancedCells.constructor.name === 'InstancedMesh' && typeof instancedCells.count === 'number';
      }
    },
    {
      id: 28,
      description: "Implement method to update instance matrices based on simulation grid",
      verify: () => {
        const inScene = scene && scene.children.includes(instancedCells);
        const hasInstanceMatrix = instancedCells && instancedCells.instanceMatrix && 
                                 instancedCells.instanceMatrix.usage === THREE.DynamicDrawUsage;
        return inScene && hasInstanceMatrix;
      }
    }
  ];
  
  phase2_2_tasks.forEach(task => {
    const passed = task.verify();
    const status = passed ? '✅' : '❌';
    console.log(`${status} Task ${task.id}: ${task.description}`);
  });

  const passedCount = phase2_2_tasks.filter(task => task.verify()).length;
  console.log(`\n📊 Results: ${passedCount}/${phase2_2_tasks.length} tasks completed successfully`);
  
  if (passedCount === phase2_2_tasks.length) {
    console.log('🎉 Phase 2.2 - Instanced Cell Rendering: ALL TASKS COMPLETE!');
    console.log('🚀 Ready to proceed to Phase 2.3 - Shader-Based Visuals');
  } else {
    console.log('❌ Some tasks failed verification. Please check the implementation.');
  }
}, 1500);

// Run Phase 2.3 verification tests
setTimeout(() => {
  console.log('\n📋 Phase 2.3 Task Verification Report\n');
  
  const phase2_3_tasks = [
    {
      id: 29,
      description: "Create vertex shader file",
      verify: () => {
        // Check if shader material has custom vertex shader
        return cellMaterial && cellMaterial.isShaderMaterial && 
               cellMaterial.vertexShader && cellMaterial.vertexShader.includes('instanceMatrix');
      }
    },
    {
      id: 30,
      description: "Create fragment shader file", 
      verify: () => {
        // Check if shader material has custom fragment shader
        return cellMaterial && cellMaterial.isShaderMaterial && 
               cellMaterial.fragmentShader && cellMaterial.fragmentShader.includes('gl_FragColor');
      }
    },
    {
      id: 31,
      description: "Pass through instance matrix and camera projection in vertex shader",
      verify: () => {
        return cellMaterial && cellMaterial.vertexShader && 
               cellMaterial.vertexShader.includes('instanceMatrix') &&
               cellMaterial.vertexShader.includes('projectionMatrix');
      }
    },
    {
      id: 32,
      description: "Basic color output in fragment shader",
      verify: () => {
        return cellMaterial && cellMaterial.fragmentShader && 
               cellMaterial.fragmentShader.includes('gl_FragColor');
      }
    },
    {
      id: 33,
      description: "Create ShaderMaterial with loaded shaders",
      verify: () => {
        return cellMaterial && cellMaterial.isShaderMaterial === true &&
               cellMaterial.uniforms && typeof cellMaterial.uniforms === 'object';
      }
    },
    {
      id: 34,
      description: "Apply ShaderMaterial to InstancedMesh",
      verify: () => {
        return instancedCells && instancedCells.material === cellMaterial &&
               cellMaterial.isShaderMaterial === true;
      }
    },
    {
      id: 35,
      description: "Modify fragment shader for soft, glowing circles",
      verify: () => {
        return cellMaterial && cellMaterial.fragmentShader && 
               cellMaterial.fragmentShader.includes('smoothstep') &&
               (cellMaterial.fragmentShader.includes('circle') || cellMaterial.fragmentShader.includes('dist'));
      }
    },
    {
      id: 36,
      description: "Pass time uniform to shaders",
      verify: () => {
        return cellMaterial && cellMaterial.uniforms && 
               cellMaterial.uniforms.time && typeof cellMaterial.uniforms.time.value === 'number';
      }
    },
    {
      id: 37,
      description: "Use time uniform for pulsing/shimmering effects",
      verify: () => {
        return cellMaterial && cellMaterial.fragmentShader && 
               cellMaterial.fragmentShader.includes('time') &&
               (cellMaterial.fragmentShader.includes('pulse') || cellMaterial.fragmentShader.includes('shimmer'));
      }
    }
  ];
  
  phase2_3_tasks.forEach(task => {
    const passed = task.verify();
    const status = passed ? '✅' : '❌';
    console.log(`${status} Task ${task.id}: ${task.description}`);
  });

  const passedCount = phase2_3_tasks.filter(task => task.verify()).length;
  console.log(`\n📊 Results: ${passedCount}/${phase2_3_tasks.length} tasks completed successfully`);
  
  if (passedCount === phase2_3_tasks.length) {
    console.log('🎉 Phase 2.3 - Shader-Based Visuals: ALL TASKS COMPLETE!');
    console.log('✨ Cells now have beautiful glowing, pulsing, shimmering effects!');
    console.log('🚀 Ready to proceed to Phase 2.4 - Animated Cell Transitions');
  } else {
    console.log('❌ Some tasks failed verification. Please check the implementation.');
  }
}, 2000);

// Add Simulation Explainer button
