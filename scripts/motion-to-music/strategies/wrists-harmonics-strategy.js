export class WristsHarmonicsStrategy {
  constructor() {
    this.frequencyRange = {
        min: 220,  // A3 (lower bound)
        max: 880   // A5 (upper bound, two octaves)
    };
        
    // MediaPipe world coordinates: Y is typically negative (below camera)
    this.heightRange = {
      min: -2.0,  // Lower position (lower frequency)
      max: -0.5   // Higher position (higher frequency)
    };

    this.amplitudeRange = {
      min: 0,
      max: 1
    };

    this.harmonicMultipliers = [1, 2, 4, 8];
  }

  map(motionData, previousParams) {
    if (!motionData || !motionData.joints) {
      return previousParams;
    }

    const leftWrist = motionData.joints.leftWrist;
    const rightWrist = motionData.joints.rightWrist;

    if (!leftWrist || !rightWrist) {
      return previousParams;
    }

    const fundamentalFrequency = this.mapHeightToFrequency(leftWrist.position.y);
    const rawAmplitude = this.mapHeightToAmplitude(rightWrist.position.y);
    const normalizedAmplitude = rawAmplitude / this.harmonicMultipliers.length;

    return this.harmonicMultipliers.map(multiplier => ({
      frequency: fundamentalFrequency * multiplier,
      amplitude: normalizedAmplitude,
      phase: 0
    }));
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
    return this.frequencyRange.min + 
           (1 - normalized) * (this.frequencyRange.max - this.frequencyRange.min);
  }

  mapHeightToAmplitude(height) {
    const clampedHeight = Math.max(
      this.heightRange.min,
      Math.min(this.heightRange.max, height)
    );

    // Normalize to 0-1 range
    const normalized = (clampedHeight - this.heightRange.min) / 
                       (this.heightRange.max - this.heightRange.min);

    // Map to amplitude range (higher position = higher amplitude)
    const amplitude = this.amplitudeRange.min + 
                     (1 - normalized) * (this.amplitudeRange.max - this.amplitudeRange.min);

    // Apply square root curve for smoother perceptual response
    return Math.sqrt(amplitude);
  }
}
