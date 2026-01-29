class SineWaveProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    this.phase = 0;
    this.currentFrequency = 440; // Hz
    this.currentAmplitude = 0;
    this.targetFrequency = 440;
    this.targetAmplitude = 0;
    
    // Smoothing factor (0-1, higher = faster response)
    // 0.1 means 10% towards target per buffer (~2.9ms smoothing)
    this.smoothingFactor = 0.1;
    
    this.port.onmessage = (event) => {
      const { frequency, amplitude } = event.data;
      this.targetFrequency = frequency;
      this.targetAmplitude = amplitude;
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0]; // Mono output (first channel)
    
    if (!channel) {
      return true;
    }

    // Interpolate current parameters towards target (smoothing)
    this.currentFrequency += (this.targetFrequency - this.currentFrequency) * this.smoothingFactor;
    this.currentAmplitude += (this.targetAmplitude - this.currentAmplitude) * this.smoothingFactor;

    // sampleRate is a global constant in AudioWorkletProcessor
    const phaseIncrement = (2 * Math.PI * this.currentFrequency) / sampleRate;

    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.sin(this.phase) * this.currentAmplitude;
      
      this.phase += phaseIncrement;
      
      if (this.phase >= 2 * Math.PI) {
        this.phase -= 2 * Math.PI;
      }
    }

    return true;
  }
}

registerProcessor('sine-wave-processor', SineWaveProcessor);
