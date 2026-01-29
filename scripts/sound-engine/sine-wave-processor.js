class SineWaveProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.waves = [
      {
        targetFrequency: 440, // Hz
        targetAmplitude: 0,
        currentFrequency: 440,
        currentAmplitude: 0,
        x: 0,
        phase: 0
      }
    ];
    
    // Smoothing factor (0-1, higher = faster response)
    // 0.1 means 10% towards target per buffer (~2.9ms smoothing)
    this.smoothingFactor = 0.1;
    
    this.port.onmessage = this.onMessage.bind(this);
  }

  onMessage(event) {
    const params = event.data;

    if (this.waves.length !== params.length) {
      this.waves = new Array(params.length).fill(null).map(() => ({
        targetFrequency: 440,
        targetAmplitude: 0,
        currentFrequency: 440,
        currentAmplitude: 0,
        x: 0,
        phase: 0
      }));
    }

    params.forEach((param, index) => {
      this.waves[index].targetFrequency = param.frequency;
      this.waves[index].targetAmplitude = param.amplitude;
      this.waves[index].phase = param.phase; // Should be constant
    });
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0]; // Mono output (first channel)
    
    if (!channel) {
      return true;
    }

    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];

      // Interpolate current parameters towards target (smoothing)
      wave.currentFrequency += (wave.targetFrequency - wave.currentFrequency) * this.smoothingFactor;
      wave.currentAmplitude += (wave.targetAmplitude - wave.currentAmplitude) * this.smoothingFactor;
      
      // sampleRate is a global constant in AudioWorkletProcessor
      const xIncrement = (2 * Math.PI * wave.currentFrequency) / sampleRate;

      for (let j = 0; j < channel.length; j++) {
        const y = Math.sin(wave.x) * wave.currentAmplitude;
        channel[j] += y;
        wave.x += xIncrement;
        
        if (wave.x >= 2 * Math.PI) {
          wave.x -= 2 * Math.PI;
        }
      }
    }

    return true;
  }
}

registerProcessor('sine-wave-processor', SineWaveProcessor);
