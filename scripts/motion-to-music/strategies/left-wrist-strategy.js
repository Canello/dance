export class LeftWristStrategy {
  constructor() {
    // MediaPipe world coordinates: Y is typically negative (below camera)
    // Typical range: -0.5m (high) to -2.0m (low) from camera
    this.frequencyRange = {
      min: 220,  // A3
      max: 880   // A5
    };

    this.heightRange = {
      min: -2.0,  // Lower position (lower frequency)
      max: -0.5   // Higher position (higher frequency)
    };

    // Typical human arm velocity: 0-5 m/s for fast movements
    this.velocityRange = {
      min: 0,
      max: 5.0
    };
  }

  map(motionData, previousParams) {
    if (!motionData || !motionData.joints) {
      // If no data, keep previous but mute amplitude
      return {
        frequency: previousParams.frequency,
        amplitude: 0
      };
    }

    const leftWrist = motionData.joints.leftWrist;

    if (!leftWrist) {
      return {
        frequency: previousParams.frequency,
        amplitude: 0
      };
    }

    const frequency = this.mapHeightToFrequency(leftWrist.position.y);
    const amplitude = this.mapVelocityToAmplitude(leftWrist.velocity.magnitude);

    return { frequency, amplitude };
  }

  mapHeightToFrequency(height) {
    const clampedHeight = Math.max(
      this.heightRange.min,
      Math.min(this.heightRange.max, height)
    );

    const normalized = (clampedHeight - this.heightRange.min) /
                       (this.heightRange.max - this.heightRange.min);

    // Since Y is negative, higher (less negative) = higher frequency
    return this.frequencyRange.min +
           (1 - normalized) * (this.frequencyRange.max - this.frequencyRange.min);
  }

  mapVelocityToAmplitude(velocity) {
    const clampedVelocity = Math.max(
      this.velocityRange.min,
      Math.min(this.velocityRange.max, velocity)
    );

    const amplitude = clampedVelocity / this.velocityRange.max;

    // Square root for smoother perceptual response
    return Math.sqrt(amplitude);
  }
}