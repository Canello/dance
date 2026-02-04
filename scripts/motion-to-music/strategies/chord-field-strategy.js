export class ChordFieldStrategy {
    constructor() {
        this.chords = makeChords();
        this.velocityRange = { min: 0.2, max: 0.5 };
        this.dt = 1 / 30;
        this.sMax = 0.05;

        this.drawer = new Drawer().drawChords(this.chords, this.sMax);
    }

    map(motionData, previousParams) {
        if (!motionData || !motionData.joints) return previousParams;
        
        const chordsWaves = this.chords.map((chord, index) => {
            const amplitudes = this.calculateAmplitudes(motionData, chord);
            const harmonics = this.calculateHarmonics(amplitudes, chord);
            return harmonics;
        });

        const waves = [];

        for (const chord of chordsWaves) {
            for (const harmonic of chord) {
                waves.push(harmonic);
            }
        }

        return waves;
    }

    calculateAmplitudes(motionData, chord) {
        const velocityRightWrist = motionData.joints.rightWrist.velocityScreen.magnitude;
        const velocityLeftWrist = motionData.joints.leftWrist.velocityScreen.magnitude;
        let normalizedVelocityRightWrist = 0;
        let normalizedVelocityLeftWrist = 0;
        if (velocityRightWrist >= this.velocityRange.min) {
            normalizedVelocityRightWrist = (velocityRightWrist - this.velocityRange.min) / (this.velocityRange.max - this.velocityRange.min);
        }
        if (velocityLeftWrist >= this.velocityRange.min) {
            normalizedVelocityLeftWrist = (velocityLeftWrist - this.velocityRange.min) / (this.velocityRange.max - this.velocityRange.min);
        }

        const sRightWrist = Math.abs(chord.x - motionData.joints.rightWrist.positionScreen.x);
        const sLeftWrist = Math.abs(chord.x - motionData.joints.leftWrist.positionScreen.x);
        const distanceFactorRightWrist = 1 - Math.min(1, sRightWrist / this.sMax);
        const distanceFactorLeftWrist = 1 - Math.min(1, sLeftWrist / this.sMax);

        const amplitudes = chord.amplitudes.map((amplitude, index) => {
            const amplitudeRightWrist = this.calculateAmplitude(chord, index, normalizedVelocityRightWrist, distanceFactorRightWrist, amplitude);
            const amplitudeLeftWrist = this.calculateAmplitude(chord, index, normalizedVelocityLeftWrist, distanceFactorLeftWrist, amplitude);
            return amplitudeRightWrist + amplitudeLeftWrist;
        });

        return amplitudes;
    }

    calculateAmplitude(chord, index, normalizedVelocity, distanceFactor, amplitude) {
        const increase = chord.kIncs[index] * normalizedVelocity * distanceFactor;
        const decrease = chord.kDecs[index] * this.dt * chord.amplitudes[index];
        chord.amplitudes[index] = chord.amplitudes[index] + increase - decrease;
        
        const clampedAmplitude = Math.min(chord.amplitudes[index], 1);
        return clampedAmplitude < 0.01 ? 0 : clampedAmplitude;
    }

    calculateHarmonics(amplitudes, chord) {
        const f0 = chord.fundamentalFrequency;
        const amplitudeNormalizationFactor = 0.5; //1 / this.chords.length;

        const harmonics = chord.harmonics.map((harmonic, index) => ({
            frequency: harmonic * f0,
            amplitude: chord.harmonicRelativeAmplitudes[index] * amplitudes[index] * amplitudeNormalizationFactor,
            phase: chord.phases[index]
        }));

        return harmonics;
    }
}

class Drawer {
    constructor() {
        this.canvas = this.createCanvas();
        this.context = this.canvas.getContext('2d');
    }

    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        document.getElementById('video-container').appendChild(canvas);
        return canvas;
    }

    drawChords(chords, sMax) {
        this.context.lineWidth = 1;
        this.context.strokeStyle = '#00FFFF';
        this.context.fillStyle = 'rgba(0, 255, 255, 0.3)';

        for (const chord of chords) {
            this.context.beginPath();
            this.context.moveTo(chord.x * this.canvas.width, 0);
            this.context.lineTo(chord.x * this.canvas.width, this.canvas.height);
            this.context.stroke();

            this.context.fillRect(
                (chord.x - sMax) * this.canvas.width,
                0,
                2* sMax * this.canvas.width,
                this.canvas.height
            );
        }
    }
}

function makeChords() {
    return [
        {
            x: 0.2,
            fundamentalFrequency: 220,
            amplitudes: [0, 0, 0],
            kDecs: [6, 18, 36],
            kIncs: [0.1, 0.1, 0.1],
            harmonics: [1, 2.5, 5],
            harmonicRelativeAmplitudes: [0.5, 0.3, 0.2],
            phases: [0, Math.PI / 2, Math.PI]
        },
        {
            x: 0.4,
            fundamentalFrequency: 500,
            amplitudes: [0, 0, 0],
            kDecs: [6, 18, 36],
            kIncs: [0.3, 0.3, 0.3],
            harmonics: [1, 2.5, 5],
            harmonicRelativeAmplitudes: [0.5, 0.3, 0.2],
            phases: [0, Math.PI / 2, Math.PI]
        },
        {
            x: 0.6,
            fundamentalFrequency: 660,
            amplitudes: [0, 0, 0],
            kDecs: [6, 18, 36],
            kIncs: [0.1, 0.1, 0.1],
            harmonics: [1, 2.5, 5],
            harmonicRelativeAmplitudes: [0.5, 0.3, 0.2],
            phases: [0, Math.PI / 2, Math.PI]
        },
        {
            x: 0.8,
            fundamentalFrequency: 900,
            amplitudes: [0, 0, 0],
            kDecs: [6, 18, 36],
            kIncs: [0.1, 0.1, 0.1],
            harmonics: [1, 2.5, 5],
            harmonicRelativeAmplitudes: [0.5, 0.3, 0.2],
            phases: [0, Math.PI / 2, Math.PI]
        }
    ];
}