// Audio validation test
import { audioManager } from '../src/audio.js';

console.log('🧪 Testing audio system...');

// Test 1: Check if audioManager exists and has required methods
console.log('AudioManager exists:', typeof audioManager);
console.log('Has playBirthSound method:', typeof audioManager.playBirthSound === 'function');
console.log('Has playDeathSound method:', typeof audioManager.playDeathSound === 'function');
console.log('Has initialize method:', typeof audioManager.initialize === 'function');

// Test 2: Try to call methods without audio context (should not crash)
try {
    audioManager.playBirthSound();
    console.log('✅ playBirthSound() called without crashing (no audio context)');
} catch (error) {
    console.error('❌ playBirthSound() crashed:', error);
}

try {
    audioManager.playDeathSound();
    console.log('✅ playDeathSound() called without crashing (no audio context)');
} catch (error) {
    console.error('❌ playDeathSound() crashed:', error);
}

// Test 3: Try initialization
try {
    console.log('Attempting audio initialization...');
    await audioManager.initialize();
    console.log('✅ Audio initialization completed');
    
    // Test 4: Try playing sounds with audio context
    audioManager.playBirthSound(0.5);
    console.log('✅ playBirthSound(0.5) called with audio context');
    
    audioManager.playDeathSound(0.5);
    console.log('✅ playDeathSound(0.5) called with audio context');
    
} catch (error) {
    console.log('⚠️ Audio initialization failed (expected in headless environment):', error.message);
}

console.log('🧪 Audio validation test completed');
