import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils
  } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

export class PoseEstimation {
  constructor() {
    this.poseLandmarker = null;
    this.isInitialized = false;
    this.isProcessing = false;
    this.onPoseCallback = null;
    this.lastResultTime = 0;
    this.minProcessingInterval = 0; // No throttling by default
    this.poseDrawer = new PoseDrawer();
  }

  async initialize() {
    try {
      if (!PoseLandmarker || !FilesetResolver) {
        throw new Error('Vision library not loaded properly. \n PoseLandmarker: ' + PoseLandmarker + '\n FilesetResolver: ' + FilesetResolver);
      }

      const wasmLoaderPath =
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
      const vision = await FilesetResolver.forVisionTasks(wasmLoaderPath);

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
        },
        runningMode: 'VIDEO',
        numPoses: 1 // We're only tracking one person
      });

      this.isInitialized = true;
      console.log('Pose Landmarker initialized');

    } catch (error) {
      console.error('Error initializing pose estimation:', error);
    }
  }

  setOnPoseCallback(callback) {
    this.onPoseCallback = callback;
  }

  async processFrame(frameData) {
    if (!this.isInitialized) {
      console.warn('Pose Landmarker not initialized');
      return null;
    }

    // Throttle processing if configured
    const now = performance.now();
    if (now - this.lastResultTime < this.minProcessingInterval) {
      return null;
    }

    if (this.isProcessing) {
      return null;
    }

    try {
      this.isProcessing = true;

      const result = this.poseLandmarker.detectForVideo(
        frameData.videoElement,
        frameData.timestamp
      );

      this.lastResultTime = performance.now();

      const poseData = this.processPoseResult(result, frameData);

      if (this.onPoseCallback && poseData) {
        this.onPoseCallback(poseData);
      }

      this.poseDrawer.drawPose(poseData);

      return poseData;
    } catch (error) {
      console.error('Error processing frame:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  processPoseResult(result, frameData) {
    if (!result.landmarks || result.landmarks.length === 0) {
      return null;
    }

    return {
      timestamp: frameData.timestamp,
      frameWidth: frameData.width,
      frameHeight: frameData.height,
      landmarks: result.landmarks,
      worldLandmarks: result.worldLandmarks
    };
  }

  setProcessingInterval(ms) {
    this.minProcessingInterval = Math.max(0, ms);
  }

  dispose() {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }

    this.isInitialized = false;
    this.onPoseCallback = null;
    console.log('Pose estimation disposed');
  }
}

class PoseDrawer {
  constructor() {
    this.canvas = this.createCanvas();
    this.context = this.canvas.getContext('2d');
    this.drawingUtils = new DrawingUtils(this.context);
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

  drawPose(poseData) {
    const landmarks = poseData?.landmarks;

    if (!poseData.landmarks) return;

    this.context.save();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const landmark of landmarks) {
        this.drawingUtils.drawLandmarks(landmark, { radius: 1, color: '#00FF00' });
        this.drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, { lineWidth: 1, color: '#00FF00' });
    }

    this.context.restore();
  }
}