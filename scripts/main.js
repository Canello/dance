import { VideoInput } from './video-input/video-input.js';
import { PoseEstimation } from './pose-estimation/pose-estimation.js';
import { MotionAnalysis } from './motion-analysis/motion-analysis.js';
import { MotionToMusic } from './motion-to-music/motion-to-music.js';

class Orchestrator {
  constructor() {
    this.videoInput = new VideoInput();
    this.poseEstimation = new PoseEstimation();
    this.motionAnalysis = new MotionAnalysis();
    this.motionToMusic = new MotionToMusic();
    
    // Debug access
    window.videoInput = this.videoInput;
    window.poseEstimation = this.poseEstimation;
    window.motionAnalysis = this.motionAnalysis;
    window.motionToMusic = this.motionToMusic;
  }

  async start() {
    this.videoInput.setOnFrameCallback((frameData) => {
      this.poseEstimation.processFrame(frameData);
    });
    this.poseEstimation.setOnPoseCallback((poseData) => {
      this.motionAnalysis.processPose(poseData);
    });
    this.motionAnalysis.setOnMotionCallback((motionData) => {
      this.motionToMusic.processMotion(motionData);
    });
    this.motionToMusic.setOnParametersCallback((params) => {
      // This will be connected to sound engine later
      console.log('Parameters:', params.frequency.toFixed(1), 'Hz,', params.amplitude.toFixed(2));
    });
    
    await this.poseEstimation.initialize();
    await this.videoInput.initialize();
    this.videoInput.start();
  }
}

const orchestrator = new Orchestrator();
document.addEventListener('DOMContentLoaded', () => {
  orchestrator.start();
});