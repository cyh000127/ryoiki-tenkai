export const copy = {
  appTitle: "Gesture Skill",
  sessionState: "Session",
  runtimeState: "Runtime",
  commandState: "Command",
  cameraReady: "Camera ready",
  runtimeIdle: "Runtime idle",
  runtimeTracking: "Tracking",
  commandWaiting: "Waiting",
  commandAccepted: "Accepted",
  commandRejected: "Rejected",
  commandStatusText: {
    waiting: "Waiting",
    accepted: "Accepted",
    rejected: "Rejected"
  },
  currentGesture: "Current gesture",
  confidence: "Confidence",
  latency: "Latency",
  start: "Start",
  simulatePinch: "Pinch",
  simulateOpenPalm: "Open palm",
  reset: "Reset",
  fallbackNotice: "Keyboard controls are available.",
  noGesture: "None",
  acceptedSkill: "Selected skill",
  rejectedReason: "Reason"
} as const;

export type CopyKey = keyof typeof copy;
