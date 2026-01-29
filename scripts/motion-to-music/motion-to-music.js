import { LeftWristStrategy } from './strategies/index.js';

export class MotionToMusic {
  constructor(strategy = new LeftWristStrategy()) {
    this.strategy = strategy;

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
    if (!motionData) {
      return null;
    }

    const params = this.strategy.map(motionData, this.currentParams);

    if (!params || typeof params.frequency !== 'number' || typeof params.amplitude !== 'number') {
      return this.currentParams;
    }

    this.currentParams = params;

    if (this.onParametersCallback) {
      this.onParametersCallback(this.currentParams);
    }

    return this.currentParams;
  }

  getCurrentParameters() {
    return { ...this.currentParams };
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  dispose() {
    this.onParametersCallback = null;
    this.currentParams = { frequency: 440, amplitude: 0 };
    console.log('Motion-to-music disposed');
  }
}
