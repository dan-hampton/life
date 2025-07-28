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
