import { expect, test } from "@playwright/test";

type SmokeStatus =
  | "idle"
  | "starting"
  | "ready"
  | "blocked"
  | "unsupported"
  | "error"
  | "stopped";

type SmokeObservation = {
  token: string | null;
  confidence: number;
  handDetected: boolean;
  stabilityMs: number;
  reason: string;
};

type SmokeInput = {
  gesture: string;
  confidence: number;
  source: string;
} | null;

type CameraSmokeResult = {
  hasMediaDevices: boolean;
  statuses: SmokeStatus[];
  observations: SmokeObservation[];
  inputs: SmokeInput[];
  runtimeStarts: number;
  runtimeStops: number;
  recognitionCalls: number;
};

test.describe("live camera permission smoke", () => {
  test("allowed camera permission emits ready status and normalized input", async ({
    context,
    page
  }) => {
    await context.grantPermissions(["camera"]);
    await page.goto("/tests/smoke/live-camera-fixture.html");

    const result = await page.evaluate(runAllowedCameraSmoke);

    expect(result.hasMediaDevices).toBe(true);
    expect(result.statuses).toEqual(["starting", "ready", "stopped"]);
    expect(result.observations[0]).toMatchObject({
      token: "seal_1",
      confidence: 0.91,
      handDetected: true,
      reason: "recognized"
    });
    expect(result.inputs[0]).toEqual({
      gesture: "seal_1",
      confidence: 0.91,
      source: "live_camera"
    });
    expect(result.runtimeStarts).toBe(1);
    expect(result.runtimeStops).toBe(1);
    expect(result.recognitionCalls).toBeGreaterThanOrEqual(1);
  });

  test("denied camera permission emits blocked status without gesture input", async ({
    page
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            throw new DOMException("Permission denied", "NotAllowedError");
          }
        }
      });
    });
    await page.goto("/tests/smoke/live-camera-fixture.html");

    const result = await page.evaluate(runDeniedCameraSmoke);

    expect(result.hasMediaDevices).toBe(true);
    expect(result.statuses).toEqual(["starting", "blocked"]);
    expect(result.observations).toEqual([]);
    expect(result.inputs).toEqual([]);
    expect(result.runtimeStarts).toBe(0);
    expect(result.runtimeStops).toBe(0);
    expect(result.recognitionCalls).toBe(0);
  });
});

async function runAllowedCameraSmoke(): Promise<CameraSmokeResult> {
  const moduleFactory = new Function(
    "return import('/src/features/gesture-session/model/liveGestureRecognizer.ts')"
  );
  const liveRecognizerModule = await moduleFactory();
  const statuses: SmokeStatus[] = [];
  const observations: SmokeObservation[] = [];
  const inputs: SmokeInput[] = [];
  let runtimeStarts = 0;
  let runtimeStops = 0;
  let recognitionCalls = 0;
  const recognizer = liveRecognizerModule.createBrowserLiveGestureRecognizer({
    getTargetSequence: () => ["seal_1", "seal_3"],
    getExpectedToken: () => "seal_1",
    pollIntervalMs: 50,
    runtime: {
      start: () => {
        runtimeStarts += 1;

        return {
          recognizeFrame: () => {
            recognitionCalls += 1;

            return {
              token: "seal_1",
              confidence: 0.91,
              handDetected: true,
              stabilityMs: 600,
              reason: "recognized"
            };
          },
          stop: () => {
            runtimeStops += 1;
          }
        };
      }
    },
    onObservation: (observation: SmokeObservation, input: SmokeInput) => {
      observations.push({
        token: observation.token,
        confidence: observation.confidence,
        handDetected: observation.handDetected,
        stabilityMs: observation.stabilityMs,
        reason: observation.reason
      });
      inputs.push(input ? { ...input } : null);
    },
    onStatusChange: (status: SmokeStatus) => {
      statuses.push(status);
    }
  });

  await recognizer.start();
  await new Promise((resolve) => window.setTimeout(resolve, 75));
  recognizer.stop();

  return {
    hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
    statuses,
    observations,
    inputs,
    runtimeStarts,
    runtimeStops,
    recognitionCalls
  };
}

async function runDeniedCameraSmoke(): Promise<CameraSmokeResult> {
  const moduleFactory = new Function(
    "return import('/src/features/gesture-session/model/liveGestureRecognizer.ts')"
  );
  const liveRecognizerModule = await moduleFactory();
  const statuses: SmokeStatus[] = [];
  const observations: SmokeObservation[] = [];
  const inputs: SmokeInput[] = [];
  const recognizer = liveRecognizerModule.createBrowserLiveGestureRecognizer({
    getTargetSequence: () => ["seal_1", "seal_3"],
    getExpectedToken: () => "seal_1",
    onObservation: (observation: SmokeObservation, input: SmokeInput) => {
      observations.push({
        token: observation.token,
        confidence: observation.confidence,
        handDetected: observation.handDetected,
        stabilityMs: observation.stabilityMs,
        reason: observation.reason
      });
      inputs.push(input ? { ...input } : null);
    },
    onStatusChange: (status: SmokeStatus) => {
      statuses.push(status);
    }
  });

  await recognizer.start();

  return {
    hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
    statuses,
    observations,
    inputs,
    runtimeStarts: 0,
    runtimeStops: 0,
    recognitionCalls: 0
  };
}
