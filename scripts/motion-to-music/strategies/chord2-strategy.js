export class Chord2Strategy {
  constructor() {
    this.dt = 1 / 30;
    this.velocityRange = { min: 0.2, max: 0.5 };

    this.leftWristChord = {
      fundamentalFrequency: 220,
      amplitudes: [0, 0, 0, 0, 0],
      kDecs: [4, 8, 16, 16 , 16],
      kIncs: [0.1, 0.1, 0.1, 0.1, 0.1],
      harmonics: [1, 2, 3, 4, 5],
      harmonicRelativeAmplitudes: [0.4, 0.4, 0.2, 0.2, 0.1],
      phases: [0, 0, 0, 0, 0]
    };

    this.rightWristChord = {
      fundamentalFrequency: 440,
      amplitudes: [0, 0, 0],
      kDecs: [6, 18, 36],
      kIncs: [0.1, 0.1, 0.1],
      harmonics: [1, 2.5, 5],
      harmonicRelativeAmplitudes: [0.5, 0.3, 0.2],
      phases: [0, Math.PI / 2, Math.PI]
    };
  }

  map(motionData, previousParams) {
    if (!motionData || !motionData.joints) {
      return previousParams.map(param => ({
        ...param,
        amplitude: 0,
        phase: 0
      }));
    }

    const leftWristJoint = motionData.joints.leftWrist;
    const rightWristJoint = motionData.joints.rightWrist;

    const leftWristHarmonics = this.makeHarmonics(
      leftWristJoint,
      this.leftWristChord
    );
    const rightWristHarmonics = this.makeHarmonics(
      rightWristJoint,
      this.rightWristChord
    );

    this.normalizeChordsAmplitudes([leftWristHarmonics, rightWristHarmonics]);
    
    return [...leftWristHarmonics, ...rightWristHarmonics];
  }

  makeHarmonics(joint, chordState) {
    const amplitudes = this.calculateAmplitudes(joint, chordState);
    return this.calculateHarmonics(amplitudes, chordState);
  }

  calculateAmplitudes(joint, chordState) {
    const velocity =
      joint && joint.velocity ? joint.velocity.magnitude : 0;
    let normalizedVelocity = 0;
    if (velocity >= this.velocityRange.min) {
      normalizedVelocity =
        (velocity - this.velocityRange.min) /
        (this.velocityRange.max - this.velocityRange.min);
    }

    return chordState.amplitudes.map((_, index) =>
      this.calculateAmplitude(normalizedVelocity, index, chordState)
    );
  }

  calculateAmplitude(normalizedVelocity, index, chordState) {
    const amplitude = chordState.amplitudes[index];
    const increase = chordState.kIncs[index] * normalizedVelocity;
    const decrease = chordState.kDecs[index] * this.dt * amplitude;

    chordState.amplitudes[index] = amplitude + increase - decrease;
    chordState.amplitudes[index] =
      chordState.amplitudes[index] < 0.1 ? 0 : chordState.amplitudes[index];

    return Math.min(chordState.amplitudes[index], 1);
  }

  calculateHarmonics(harmonicAmplitudes, chordState) {
    const f0 = chordState.fundamentalFrequency;
    return chordState.harmonics.map((harmonic, index) => ({
      frequency: harmonic * f0,
      amplitude:
        chordState.harmonicRelativeAmplitudes[index] * harmonicAmplitudes[index],
      phase: chordState.phases[index]
    }));
  }

  normalizeChordsAmplitudes(chords) {
    const normalizationFactor = 1 / chords.length;

    for (const chord of chords) {
      for (const harmonic of chord) {
        harmonic.amplitude = harmonic.amplitude * normalizationFactor;
      }
    }
  }
}
