import { PoseEstimation } from './pose-estimation/main.js';
import { VideoInput } from './video-input/main.js';

class Orchestrator {
  constructor() {
    this.videoInput = new VideoInput();
    window.videoInput = this.videoInput;

    this.poseEstimation = new PoseEstimation();
  }

  async start() {
    this.startVideoInput((frameData) => {
      // This will be connected to pose estimation later
      console.log('Frame received:', frameData.videoElement);
    });
  }

  async startVideoInput(onFrameCallback) {
    await this.videoInput.initialize();
    this.videoInput.setOnFrameCallback(onFrameCallback);
    this.videoInput.start();
  }
}

const orchestrator = new Orchestrator();
document.addEventListener('DOMContentLoaded', () => {
  orchestrator.start();
});