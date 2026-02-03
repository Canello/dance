import {
  Chord2Strategy,
  ChordStrategy,
  LeftWristStrategy,
  WristsHarmonicsStrategy
} from './strategies/index.js';

export class MotionToMusic {
  constructor(strategy = new Chord2Strategy()) {
    this.strategy = strategy;

    this.currentParams = [
      {
        frequency: 440,  // Default: A4
        amplitude: 0,    // Default: silent
        phase: 0
      }
    ];

    this.onParametersCallback = null;
  }

  setOnParametersCallback(callback) {
    this.onParametersCallback = callback;
  }

  processMotion(motionData) {
    const params = this.strategy.map(motionData, this.currentParams);

    if (!Array.isArray(params)) {
      return this.currentParams;
    }

    this.currentParams = params;

    if (this.onParametersCallback) {
      this.onParametersCallback(this.currentParams);
    }

    return this.currentParams;
  }

  getCurrentParameters() {
    return [...this.currentParams];
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  dispose() {
    this.onParametersCallback = null;
    this.currentParams = [{ frequency: 440, amplitude: 0, phase: 0 }];
    console.log('Motion-to-music disposed');
  }
}
