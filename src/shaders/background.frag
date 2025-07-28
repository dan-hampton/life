// Task 46: Background fragment shader for procedural starfield
// Task 47: Time-based animation for drifting and twinkling

uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

// Simplex noise function for procedural generation
// Simplified 2D noise implementation
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// Fractal noise for more complex patterns
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

// Generate starfield
float stars(vec2 uv, float threshold, float size) {
    vec2 grid = floor(uv * size);
    vec2 localUv = fract(uv * size);
    
    // Random position within each grid cell
    vec2 starPos = hash(grid) * 0.6 + 0.2; // Keep stars away from edges
    float dist = length(localUv - starPos);
    
    // Star brightness based on hash
    float brightness = hash(grid + vec2(13.7, 27.3));
    
    // Only show stars above threshold
    if (brightness < threshold) return 0.0;
    
    // Create soft star with distance falloff
    float star = smoothstep(0.1, 0.0, dist) * brightness;
    
    return star;
}

void main() {
    // Task 47: Animated UV coordinates for drifting effect
    vec2 uv = vUv;
    vec2 driftUv = uv + vec2(time * 0.01, time * 0.005); // Slow drift
    
    // Base deep space color - very dark blue with subtle variation
    vec3 spaceColor = vec3(0.02, 0.05, 0.12);
    
    // Add subtle nebula-like variation using fractal noise
    float nebula = fbm(driftUv * 2.0 + time * 0.02);
    nebula = smoothstep(0.3, 0.7, nebula);
    vec3 nebulaColor = vec3(0.1, 0.05, 0.15) * nebula * 0.3;
    
    // Generate multiple layers of stars with different sizes and densities
    float bigStars = stars(driftUv, 0.95, 8.0);  // Large, rare stars
    float medStars = stars(driftUv + vec2(100.0), 0.85, 16.0); // Medium stars
    float smallStars = stars(driftUv + vec2(200.0), 0.7, 32.0); // Small, frequent stars
    
    // Task 47: Add twinkling effect
    float twinkle1 = sin(time * 3.0 + hash(floor(driftUv * 8.0)) * 10.0) * 0.5 + 0.5;
    float twinkle2 = sin(time * 2.5 + hash(floor(driftUv * 16.0) + vec2(50.0)) * 15.0) * 0.5 + 0.5;
    float twinkle3 = sin(time * 4.0 + hash(floor(driftUv * 32.0) + vec2(100.0)) * 20.0) * 0.5 + 0.5;
    
    bigStars *= (twinkle1 * 0.3 + 0.7);
    medStars *= (twinkle2 * 0.2 + 0.8);
    smallStars *= (twinkle3 * 0.1 + 0.9);
    
    // Star colors - slightly blue-white to warm white
    vec3 starColor1 = vec3(0.9, 0.95, 1.0); // Cool white
    vec3 starColor2 = vec3(1.0, 0.9, 0.8);  // Warm white
    vec3 starColor3 = vec3(0.8, 0.9, 1.0);  // Blue-white
    
    // Combine all elements
    vec3 finalColor = spaceColor + nebulaColor;
    finalColor += bigStars * starColor1 * 1.2;
    finalColor += medStars * starColor2 * 0.8;
    finalColor += smallStars * starColor3 * 0.6;
    
    // Add subtle atmospheric perspective
    float vignette = 1.0 - length(uv - 0.5) * 0.8;
    finalColor *= vignette;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
