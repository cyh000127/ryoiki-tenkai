import {
  EMPTY_GESTURE_READING,
  type GestureKey,
  type GestureReading
} from "../../../entities/gesture/model";

export type GestureSessionState = {
  isCameraReady: boolean;
  isTracking: boolean;
  reading: GestureReading;
  commandStatus: "waiting" | "accepted" | "rejected";
  selectedSkillActionKey: string | null;
  rejectReason: string | null;
};

export type GestureSessionAction =
  | { type: "start" }
  | { type: "detect"; gestureKey: GestureKey; confidence: number; latencyMs: number }
  | { type: "accept"; skillActionKey: string }
  | { type: "reject"; reason: string }
  | { type: "reset" };

export const initialGestureSessionState: GestureSessionState = {
  isCameraReady: false,
  isTracking: false,
  reading: EMPTY_GESTURE_READING,
  commandStatus: "waiting",
  selectedSkillActionKey: null,
  rejectReason: null
};

export function gestureSessionReducer(
  state: GestureSessionState,
  action: GestureSessionAction
): GestureSessionState {
  switch (action.type) {
    case "start":
      return {
        ...state,
        isCameraReady: true,
        isTracking: true,
        commandStatus: "waiting",
        rejectReason: null
      };
    case "detect":
      return {
        ...state,
        reading: {
          gestureKey: action.gestureKey,
          confidence: action.confidence,
          latencyMs: action.latencyMs
        },
        commandStatus: "waiting",
        rejectReason: null
      };
    case "accept":
      return {
        ...state,
        commandStatus: "accepted",
        selectedSkillActionKey: action.skillActionKey,
        rejectReason: null
      };
    case "reject":
      return {
        ...state,
        commandStatus: "rejected",
        selectedSkillActionKey: null,
        rejectReason: action.reason
      };
    case "reset":
      return initialGestureSessionState;
    default:
      return state;
  }
}
