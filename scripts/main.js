import { VideoInput } from './video-input/video-input.js';
import { PoseEstimation } from './pose-estimation/pose-estimation.js';
import { MotionAnalysis } from './motion-analysis/motion-analysis.js';
import { MotionToMusic } from './motion-to-music/motion-to-music.js';
import { SoundEngine } from './sound-engine/sound-engine.js';

class Orchestrator {
  constructor() {
    this.videoInput = new VideoInput();
    this.poseEstimation = new PoseEstimation();
    this.motionAnalysis = new MotionAnalysis();
    this.motionToMusic = new MotionToMusic();
    this.soundEngine = new SoundEngine();
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
      this.soundEngine.updateParameters(params);
    });
    
    await this.soundEngine.initialize();
    await this.soundEngine.start();
    await this.poseEstimation.initialize();
    await this.videoInput.initialize();
    this.videoInput.start();
  }
}

const orchestrator = new Orchestrator();
document.addEventListener('DOMContentLoaded', () => {
  orchestrator.start();
});