export class ChordStrategy {
    constructor() {    
        this.velocityRange = { min: 0.2, max: 0.5 };
        this.dt = 1/30;
        this.amplitudes = [0, 0, 0];
        this.kDecs = [6, 18, 36];
        this.kIncs = [0.1, 0.1, 0.1];
        this.harmonics = [1, 2.5, 5];
        this.harmonicRelativeAmplitudes = [0.5, 0.3, 0.2];
        this.phases = [0, Math.PI/2, Math.PI];
    }

    map(motionData, previousParams) {
        if (!motionData || !motionData.joints) {
          return previousParams.map(param => ({
            ...param,
            amplitude: 0,
            phase: 0
          }));
        }

        const amplitudes = this.calculateAmplitudes(motionData);
        const fundamentalFrequency = this.calculateFundamentalFrequency(motionData);
        const harmonics = this.calculateHarmonics(amplitudes, fundamentalFrequency);
        return harmonics;
    }

    calculateAmplitudes(motionData) {
        const velocity = motionData.joints.rightWrist.velocity.magnitude;
        let normalizedVelocity = 0;

        if (velocity >= this.velocityRange.min) {
            normalizedVelocity = (velocity - this.velocityRange.min) / (this.velocityRange.max - this.velocityRange.min);
        }

        return this.amplitudes.map((amplitude, index) => this.calculateAmplitude(normalizedVelocity, index));
    }
    
    calculateAmplitude(normalizedVelocity, index) {
        const increase = this.kIncs[index] * normalizedVelocity;
        const decrease = this.kDecs[index] * this.dt * this.amplitudes[index];

        this.amplitudes[index] = this.amplitudes[index] + increase - decrease;
        this.amplitudes[index] = this.amplitudes[index] < 0.1 ? 0 : this.amplitudes[index];

        return Math.min(this.amplitudes[index], 1);
    }

    calculateFundamentalFrequency(motionData) {
        const rightWristVelocityY = motionData.joints.rightWrist.velocity.y;
        if (rightWristVelocityY > 0) {
            return 440;
        } else {
            return 660;
        }
    }

    calculateHarmonics(harmonicAmplitudes, fundamentalFrequency) {
        return this.harmonics.map((harmonic, index) => ({
            frequency: harmonic * fundamentalFrequency,
            amplitude: this.harmonicRelativeAmplitudes[index] * harmonicAmplitudes[index],
            phase: 0
        }));
    }
}