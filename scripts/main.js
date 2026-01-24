import { VideoInput } from './video-input/video-input.js';
import { PoseEstimation } from './pose-estimation/pose-estimation.js';

class Orchestrator {
  constructor() {
    this.videoInput = new VideoInput();
    this.poseEstimation = new PoseEstimation();
    
    // Debug access
    window.videoInput = this.videoInput;
    window.poseEstimation = this.poseEstimation;
  }

  async start() {
    await this.poseEstimation.initialize();
    this.poseEstimation.setOnPoseCallback((poseData) => {
      // This will be connected to motion analysis later
      // console.log('Pose detected:', poseData);
    });

    await this.videoInput.initialize();
    this.videoInput.setOnFrameCallback((frameData) => {
      this.poseEstimation.processFrame(frameData);
    });
    this.videoInput.start();
  }
}

const orchestrator = new Orchestrator();
document.addEventListener('DOMContentLoaded', () => {
  orchestrator.start();
});