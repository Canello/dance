import { VideoInput } from './video-input/video-input.js';
import { PoseEstimation } from './pose-estimation/pose-estimation.js';
import { MotionAnalysis } from './motion-analysis/motion-analysis.js';

class Orchestrator {
  constructor() {
    this.videoInput = new VideoInput();
    this.poseEstimation = new PoseEstimation();
    this.motionAnalysis = new MotionAnalysis();
    
    // Debug access
    window.videoInput = this.videoInput;
    window.poseEstimation = this.poseEstimation;
    window.motionAnalysis = this.motionAnalysis;
  }

  async start() {
    this.motionAnalysis.setOnMotionCallback((motionData) => {
      // This will be connected to motion-to-music mapping later
      console.log('Motion:', motionData.body.energy);
    });
    
    await this.poseEstimation.initialize();
    this.poseEstimation.setOnPoseCallback((poseData) => {
      this.motionAnalysis.processPose(poseData);
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