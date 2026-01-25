export class MotionAnalysis {
  constructor() {
    // Key joints to track (MediaPipe indices)
    this.keyJoints = {
      leftShoulder: 11,
      rightShoulder: 12,
      leftElbow: 13,
      rightElbow: 14,
      leftWrist: 15,
      rightWrist: 16,
      leftHip: 23,
      rightHip: 24,
      leftKnee: 25,
      rightKnee: 26,
      leftAnkle: 27,
      rightAnkle: 28,
      nose: 0
    };

    this.bufferSize = 5;
    this.history = [];
    this.smoothingAlpha = 0.25;
    this.smoothedPositions = new Map();
    this.onMotionCallback = null;
    this.previousTimestamp = null;
  }

  setOnMotionCallback(callback) {
    this.onMotionCallback = callback;
  }

  processPose(poseData) {
    if (!poseData || !poseData.worldLandmarks || poseData.worldLandmarks.length === 0) {
      return null;
    }

    const timestamp = poseData.timestamp;
    const worldLandmarks = poseData.worldLandmarks[0]; // First person
    const deltaTime = this.previousTimestamp 
      ? (timestamp - this.previousTimestamp) / 1000 // Convert to seconds
      : 0.033; // Default ~30 FPS if first frame

    const smoothedPositions = this.smoothPositions(worldLandmarks);
    const motionData = this.calculateMotionFeatures(smoothedPositions, deltaTime, timestamp);

    this.addToHistory(motionData);
    this.previousTimestamp = timestamp;

    if (this.onMotionCallback) {
      this.onMotionCallback(motionData);
    }

    return motionData;
  }

  // Smooth positions using Exponential Moving Average (EMA)
  smoothPositions(worldLandmarks) {
    const smoothed = new Map();

    for (const [jointName, jointIndex] of Object.entries(this.keyJoints)) {
      const landmark = worldLandmarks[jointIndex];
      
      if (!landmark) continue;

      const currentPos = {
        x: landmark.x,
        y: landmark.y,
        z: landmark.z
      };
      const previousSmoothed = this.smoothedPositions.get(jointName);
      
      if (!previousSmoothed) {
        // First frame: use current position
        smoothed.set(jointName, currentPos);
      } else {
        // EMA: new = alpha * current + (1 - alpha) * previous
        smoothed.set(jointName, {
          x: this.smoothingAlpha * currentPos.x + (1 - this.smoothingAlpha) * previousSmoothed.x,
          y: this.smoothingAlpha * currentPos.y + (1 - this.smoothingAlpha) * previousSmoothed.y,
          z: this.smoothingAlpha * currentPos.z + (1 - this.smoothingAlpha) * previousSmoothed.z
        });
      }
    }

    this.smoothedPositions = smoothed;

    return smoothed;
  }

  calculateMotionFeatures(smoothedPositions, deltaTime, timestamp) {
    const motionData = {
      timestamp: timestamp,
      joints: {},
      body: {}
    };

    const previousFrame = this.history.length > 0 
      ? this.history[this.history.length - 1]
      : null;

    motionData.joints = this.calculateJointsFeatures(smoothedPositions, deltaTime, previousFrame);
    motionData.body = this.calculateBodyFeatures(motionData.joints);

    return motionData;
  }

  calculateJointsFeatures(smoothedPositions, deltaTime, previousFrame) {
    const jointMotions = {};

    for (const [jointName, currentPos] of smoothedPositions.entries()) {
      const jointMotion = {
        position: { ...currentPos },
        velocity: { x: 0, y: 0, z: 0, magnitude: 0 },
        acceleration: { x: 0, y: 0, z: 0, magnitude: 0 }
      };

      if (previousFrame && previousFrame.joints[jointName]) {
        const prevPos = previousFrame.joints[jointName].position;
        
        if (deltaTime > 0) {
          jointMotion.velocity = {
            x: (currentPos.x - prevPos.x) / deltaTime,
            y: (currentPos.y - prevPos.y) / deltaTime,
            z: (currentPos.z - prevPos.z) / deltaTime
          };
          
          jointMotion.velocity.magnitude = Math.sqrt(
            jointMotion.velocity.x ** 2 +
            jointMotion.velocity.y ** 2 +
            jointMotion.velocity.z ** 2
          );
        }

        if (previousFrame.joints[jointName].velocity && deltaTime > 0) {
          const prevVel = previousFrame.joints[jointName].velocity;
          jointMotion.acceleration = {
            x: (jointMotion.velocity.x - prevVel.x) / deltaTime,
            y: (jointMotion.velocity.y - prevVel.y) / deltaTime,
            z: (jointMotion.velocity.z - prevVel.z) / deltaTime
          };
          
          jointMotion.acceleration.magnitude = Math.sqrt(
            jointMotion.acceleration.x ** 2 +
            jointMotion.acceleration.y ** 2 +
            jointMotion.acceleration.z ** 2
          );
        }
      }

      jointMotions[jointName] = jointMotion;
    }

    return jointMotions;
  }

  calculateBodyFeatures(joints) {
    const features = {
      centerOfMass: { x: 0, y: 0, z: 0 },
      overallVelocity: 0,
      overallAcceleration: 0,
      activityLevel: 0,
      energy: 0
    };

    const jointsArray = Object.values(joints);

    const validJoints = jointsArray.filter(j => j.position);
    if (validJoints.length > 0) {
      features.centerOfMass = {
        x: validJoints.reduce((sum, j) => sum + j.position.x, 0) / validJoints.length,
        y: validJoints.reduce((sum, j) => sum + j.position.y, 0) / validJoints.length,
        z: validJoints.reduce((sum, j) => sum + j.position.z, 0) / validJoints.length
      };
    }

    const velocities = jointsArray
      .map(j => j.velocity.magnitude || 0)
      .filter(v => v > 0);
    if (velocities.length > 0) {
      features.overallVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    }

    const accelerations = jointsArray
      .map(j => j.acceleration.magnitude || 0)
      .filter(a => a > 0);
    if (accelerations.length > 0) {
      features.overallAcceleration = accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length;
    }

    features.activityLevel = features.overallVelocity;
    features.energy = velocities.reduce((sum, v) => sum + v ** 2, 0);

    return features;
  }

  addToHistory(motionData) {
    this.history.push(motionData);
    
    // Keep only last N frames
    if (this.history.length > this.bufferSize) {
      this.history.shift();
    }
  }

  reset() {
    this.history = [];
    this.smoothedPositions.clear();
    this.previousTimestamp = null;
  }

  dispose() {
    this.reset();
    this.onMotionCallback = null;
    console.log('Motion analysis disposed');
  }
}
