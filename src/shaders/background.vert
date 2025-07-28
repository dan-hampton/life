// Task 46: Background vertex shader for procedural starfield
// Full-screen quad vertex shader

varying vec2 vUv;

void main() {
    // Pass UV coordinates to fragment shader
    vUv = uv;
    
    // Transform vertex position to screen space
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
