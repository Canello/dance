export class VideoInput {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.isRunning = false;
    this.onFrameCallback = null;
    this.animationFrameId = null;
  }

  async initialize() {
    this.videoElement = document.getElementById('webcam');
    const statusEl = document.getElementById('status');
    
    statusEl.textContent = 'Requesting camera access...';

    const defaultConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'user' // Front-facing camera
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
      this.videoElement.srcObject = this.stream;
      
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(resolve)
            .catch(reject);
        };
        this.videoElement.onerror = reject;
      });

      console.log('Camera initialized:', {
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight
      });

      statusEl.textContent = 'Camera ready';
      statusEl.className = 'ready';
    } catch (error) {
      console.error('Error initializing camera:', error);
      statusEl.textContent = `Error: ${error.message}`;
      statusEl.className = 'error';
    }
  }

  setOnFrameCallback(callback) {
    this.onFrameCallback = callback;
  }

  start() {
    if (this.isRunning) {
      console.warn('Video input already running');
      return;
    }

    if (!this.videoElement) {
      console.error('Video element not initialized. Call initialize() first.');
      return;
    }

    this.isRunning = true;
    this.captureLoop();
    console.log('Video input started');
  }

  captureLoop() {
    if (!this.isRunning) return;

    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      const frameData = {
        videoElement: this.videoElement,
        timestamp: performance.now(),
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight
      };

      if (this.onFrameCallback) {
        this.onFrameCallback(frameData);
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.captureLoop());
  }

  stop() {
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log('Video input stopped');
  }

  dispose() {
    this.stop();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.onFrameCallback = null;
    console.log('Video input disposed');
  }

  getDimensions() {
    if (!this.videoElement) return { width: 0, height: 0 };
    
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight
    };
  }
}