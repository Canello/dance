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
    this.smoothedPositionsScreen = new Map();
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
    if (!poseData.landmarks || poseData.landmarks.length === 0) {
      return null;
    }

    const timestamp = poseData.timestamp;
    const worldLandmarks = poseData.worldLandmarks[0];
    const landmarks = poseData.landmarks[0];
    const deltaTime = this.previousTimestamp
      ? (timestamp - this.previousTimestamp) / 1000
      : 0.033;

    const smoothedWorld = this.smoothPositions(worldLandmarks, this.smoothedPositions);
    const smoothedScreen = this.smoothPositions(landmarks, this.smoothedPositionsScreen);
    const motionData = this.calculateMotionFeatures(smoothedWorld, smoothedScreen, deltaTime, timestamp);

    this.addToHistory(motionData);
    this.previousTimestamp = timestamp;

    if (this.onMotionCallback) {
      this.onMotionCallback(motionData);
    }

    return motionData;
  }

  // Smooth positions using EMA. cache = this.smoothedPositions (world) or this.smoothedPositionsScreen (screen).
  smoothPositions(landmarks, cache) {
    const smoothed = new Map();

    for (const [jointName, jointIndex] of Object.entries(this.keyJoints)) {
      const landmark = landmarks[jointIndex];
      if (!landmark) continue;

      const currentPos = {
        x: landmark.x,
        y: landmark.y,
        z: landmark.z ?? 0
      };
      const previousSmoothed = cache.get(jointName);

      if (!previousSmoothed) {
        smoothed.set(jointName, currentPos);
      } else {
        smoothed.set(jointName, {
          x: this.smoothingAlpha * currentPos.x + (1 - this.smoothingAlpha) * previousSmoothed.x,
          y: this.smoothingAlpha * currentPos.y + (1 - this.smoothingAlpha) * previousSmoothed.y,
          z: this.smoothingAlpha * currentPos.z + (1 - this.smoothingAlpha) * previousSmoothed.z
        });
      }
    }

    for (const [k, v] of smoothed) cache.set(k, v);
    return smoothed;
  }

  calculateMotionFeatures(smoothedWorld, smoothedScreen, deltaTime, timestamp) {
    const motionData = {
      timestamp,
      joints: {},
      body: {},
      bodyScreen: {}
    };

    const previousFrame = this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;

    motionData.joints = this.calculateJointsFeatures(smoothedWorld, smoothedScreen, deltaTime, previousFrame);
    motionData.body = this.calculateBodyFeatures(motionData.joints, 'world');
    motionData.bodyScreen = this.calculateBodyFeatures(motionData.joints, 'screen');

    return motionData;
  }

  calculateJointsFeatures(smoothedWorld, smoothedScreen, deltaTime, previousFrame) {
    const jointMotions = {};

    for (const [jointName, currentPos] of smoothedWorld.entries()) {
      const currentScreen = smoothedScreen.get(jointName);
      const jointMotion = {
        position: { ...currentPos },
        velocity: { x: 0, y: 0, z: 0, magnitude: 0 },
        acceleration: { x: 0, y: 0, z: 0, magnitude: 0 },
        positionScreen: currentScreen ? { ...currentScreen } : { x: 0, y: 0, z: 0 },
        velocityScreen: { x: 0, y: 0, z: 0, magnitude: 0 },
        accelerationScreen: { x: 0, y: 0, z: 0, magnitude: 0 }
      };

      const prev = previousFrame?.joints[jointName];
      if (prev && deltaTime > 0) {
        const prevPos = prev.position;
        jointMotion.velocity = {
          x: (currentPos.x - prevPos.x) / deltaTime,
          y: (currentPos.y - prevPos.y) / deltaTime,
          z: (currentPos.z - prevPos.z) / deltaTime
        };
        jointMotion.velocity.magnitude = Math.sqrt(
          jointMotion.velocity.x ** 2 + jointMotion.velocity.y ** 2 + jointMotion.velocity.z ** 2
        );

        if (prev.velocity) {
          const pv = prev.velocity;
          jointMotion.acceleration = {
            x: (jointMotion.velocity.x - pv.x) / deltaTime,
            y: (jointMotion.velocity.y - pv.y) / deltaTime,
            z: (jointMotion.velocity.z - pv.z) / deltaTime
          };
          jointMotion.acceleration.magnitude = Math.sqrt(
            jointMotion.acceleration.x ** 2 +
            jointMotion.acceleration.y ** 2 +
            jointMotion.acceleration.z ** 2
          );
        }
      }

      if (currentScreen && prev?.positionScreen) {
        const ps = prev.positionScreen;
        jointMotion.velocityScreen = {
          x: (currentScreen.x - ps.x) / deltaTime,
          y: (currentScreen.y - ps.y) / deltaTime,
          z: ((currentScreen.z ?? 0) - (ps.z ?? 0)) / deltaTime
        };
        jointMotion.velocityScreen.magnitude = Math.sqrt(
          jointMotion.velocityScreen.x ** 2 +
          jointMotion.velocityScreen.y ** 2 +
          jointMotion.velocityScreen.z ** 2
        );
        if (prev.velocityScreen) {
          const pvs = prev.velocityScreen;
          jointMotion.accelerationScreen = {
            x: (jointMotion.velocityScreen.x - pvs.x) / deltaTime,
            y: (jointMotion.velocityScreen.y - pvs.y) / deltaTime,
            z: (jointMotion.velocityScreen.z - pvs.z) / deltaTime
          };
          jointMotion.accelerationScreen.magnitude = Math.sqrt(
            jointMotion.accelerationScreen.x ** 2 +
            jointMotion.accelerationScreen.y ** 2 +
            jointMotion.accelerationScreen.z ** 2
          );
        }
      }

      jointMotions[jointName] = jointMotion;
    }

    return jointMotions;
  }

  calculateBodyFeatures(joints, space) {
    const posKey = space === 'screen' ? 'positionScreen' : 'position';
    const velKey = space === 'screen' ? 'velocityScreen' : 'velocity';
    const accKey = space === 'screen' ? 'accelerationScreen' : 'acceleration';

    const features = {
      centerOfMass: { x: 0, y: 0, z: 0 },
      overallVelocity: 0,
      overallAcceleration: 0,
      activityLevel: 0,
      energy: 0
    };

    const jointsArray = Object.values(joints);
    const validJoints = jointsArray.filter(j => j[posKey]);
    if (validJoints.length > 0) {
      const pos = validJoints[0][posKey];
      const hasZ = 'z' in pos && pos.z !== undefined;
      features.centerOfMass = {
        x: validJoints.reduce((sum, j) => sum + j[posKey].x, 0) / validJoints.length,
        y: validJoints.reduce((sum, j) => sum + j[posKey].y, 0) / validJoints.length,
        z: hasZ ? validJoints.reduce((sum, j) => sum + (j[posKey].z ?? 0), 0) / validJoints.length : 0
      };
    }

    const velocities = jointsArray.map(j => j[velKey]?.magnitude ?? 0).filter(v => v > 0);
    if (velocities.length > 0) {
      features.overallVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    }
    const accelerations = jointsArray.map(j => j[accKey]?.magnitude ?? 0).filter(a => a > 0);
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
    this.smoothedPositionsScreen.clear();
    this.previousTimestamp = null;
  }

  dispose() {
    this.reset();
    this.onMotionCallback = null;
    console.log('Motion analysis disposed');
  }
}
