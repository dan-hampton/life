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
    
    // Task 41: Birth animation - neon blue birth with fade to normal color
    float birthGlow = 1.0;
    vec3 birthColor = color;
    if (vAge <= 8.0 && vAge > 0.0) {
        // Neon blue color for newly born cells
        vec3 neonBlue = vec3(0.0, 0.8, 2.0); // Bright cyan-blue
        float birthFactor = (8.0 - vAge) / 8.0; // Fade over 8 frames
        birthColor = mix(color, neonBlue, birthFactor * 0.8); // Mix with neon blue
        birthGlow = 1.0 + birthFactor * 1.2; // Extra brightness fades over first 8 frames
    }
    
    // Task 43: Dying animation - fade out effect
    float dyingFade = 1.0;
    vec3 finalColor = birthColor;
    if (vIsDying > 0.5) {
        dyingFade = 0.3; // Fade to 30% opacity
        finalColor = mix(birthColor, vec3(1.0, 0.3, 0.0), 0.7); // Shift to orange-red
    }
    
    // Combine effects
    float intensity = circle * pulse * shimmer * birthGlow * dyingFade;
    
    // Task 32: Output color with glow effect
    vec3 glowColor = finalColor * intensity;
    
    // Add outer glow for extra luminosity
    float outerGlow = 1.0 - smoothstep(0.0, 1.2, dist);
    glowColor += finalColor * outerGlow * 0.3 * pulse * dyingFade;
    
    gl_FragColor = vec4(glowColor, intensity);
}
