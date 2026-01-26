export class MotionToMusic {
  constructor() {
    // MediaPipe world coordinates: Y is typically negative (below camera)
    // Typical range: -0.5m (high) to -2.0m (low) from camera
    this.frequencyRange = {
      min: 220,  // A3 (lower bound)
      max: 880   // A5 (upper bound, two octaves above)
    };
    
    this.heightRange = {
      min: -2.0,  // Lower position (lower frequency)
      max: -0.5   // Higher position (higher frequency)
    };

    // Typical human arm velocity: 0-5 m/s for fast movements
    this.velocityRange = {
      min: 0,    // No movement
      max: 5.0   // Fast movement (m/s)
    };

    this.currentParams = {
      frequency: 440,  // Default: A4
      amplitude: 0     // Default: silent
    };

    this.onParametersCallback = null;
  }

  setOnParametersCallback(callback) {
    this.onParametersCallback = callback;
  }

  processMotion(motionData) {
    if (!motionData || !motionData.joints) {
      return null;
    }

    const leftWrist = motionData.joints.leftWrist;

    if (!leftWrist) {
      this.updateParameters(this.currentParams.frequency, 0);
      return this.currentParams;
    }

    const frequency = this.mapHeightToFrequency(leftWrist.position.y);
    const amplitude = this.mapVelocityToAmplitude(leftWrist.velocity.magnitude);

    this.currentParams = {
        frequency: frequency,
        amplitude: amplitude
    };
  
    if (this.onParametersCallback) {
        this.onParametersCallback(this.currentParams);
    }

    return this.currentParams;
  }

  mapHeightToFrequency(height) {
    const clampedHeight = Math.max(
      this.heightRange.min,
      Math.min(this.heightRange.max, height)
    );

    // Normalize to 0-1 range
    const normalized = (clampedHeight - this.heightRange.min) / 
                       (this.heightRange.max - this.heightRange.min);

    // Map to frequency range (inverted: higher position = higher frequency)
    // Since Y is negative, higher (less negative) = higher frequency
    const frequency = this.frequencyRange.min + 
                     (1 - normalized) * (this.frequencyRange.max - this.frequencyRange.min);

    return frequency;
  }

  mapVelocityToAmplitude(velocity) {
    const clampedVelocity = Math.max(
      this.velocityRange.min,
      Math.min(this.velocityRange.max, velocity)
    );

    // Normalize to 0-1 range
    const amplitude = clampedVelocity / this.velocityRange.max;

    // Apply a curve to make it more responsive (square root for smoother response)
    return Math.sqrt(amplitude);
  }

  getCurrentParameters() {
    return { ...this.currentParams };
  }

  setFrequencyRange(min, max) {
    this.frequencyRange = { min, max };
  }

  setHeightRange(min, max) {
    this.heightRange = { min, max };
  }

  setVelocityRange(min, max) {
    this.velocityRange = { min, max };
  }

  dispose() {
    this.onParametersCallback = null;
    this.currentParams = { frequency: 440, amplitude: 0 };
    console.log('Motion-to-music disposed');
  }
}
