export class SoundEngine {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.isInitialized = false;
    this.isRunning = false;
    this.startOnUserGesture();
  }

  startOnUserGesture() {
    document.addEventListener('click', () => {
      if (this.isRunning) return;
      this.start();
    });
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn('Sound engine already initialized');
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100,
        latencyHint: 'interactive'
      });

      await this.audioContext.audioWorklet.addModule(
        new URL('./sine-wave-processor.js', import.meta.url)
      );

      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'sine-wave-processor'
      );

      this.workletNode.port.onmessageerror = (error) => {
        console.error('AudioWorklet message error:', error);
      };

      this.workletNode.connect(this.audioContext.destination);
      this.isInitialized = true;
      console.log('Sound engine initialized');

    } catch (error) {
      console.error('Error initializing sound engine:', error);
      throw error;
    }
  }

  updateParameters(params) {
    if (!this.isInitialized || !this.workletNode) {
      console.warn('Sound engine not initialized');
      return;
    }

    this.workletNode.port.postMessage({
      frequency: params.frequency || 440,
      amplitude: params.amplitude || 0
    });
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error('Sound engine not initialized');
    }

    if (this.isRunning) {
      console.warn('Sound engine already running');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isRunning = true;
    console.log('Sound engine started');
  }

  async stop() {
    if (!this.isRunning) return;

    this.updateParameters({ frequency: 440, amplitude: 0 });

    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
    }

    this.isRunning = false;
    console.log('Sound engine stopped');
  }

  dispose() {
    this.updateParameters({ frequency: 440, amplitude: 0 });

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioContext = null;
    this.isInitialized = false;
    console.log('Sound engine disposed');
  }
}
