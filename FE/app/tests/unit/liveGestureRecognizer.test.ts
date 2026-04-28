import {
  classifyMediaPipeHandGesture,
  createBrowserFrameSignalRecognizer,
  createBrowserFrameSignalRuntime,
  createBrowserLiveGestureRecognizer,
  createMediaPipeHandGestureRuntime,
  type LiveGestureObservation,
  type LiveGestureRecognizerStatus
} from "../../src/features/gesture-session/model/liveGestureRecognizer";

describe("createBrowserLiveGestureRecognizer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts the browser camera and emits normalized live gesture input", async () => {
    vi.useFakeTimers();
    const track = {
      stop: vi.fn()
    } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track]
    } as unknown as MediaStream;
    const mediaDevices = {
      getUserMedia: vi.fn(async () => stream)
    };
    const video = {
      muted: false,
      playsInline: false,
      srcObject: null,
      play: vi.fn(async () => undefined)
    } as unknown as HTMLVideoElement;
    const statuses: LiveGestureRecognizerStatus[] = [];
    const observations: LiveGestureObservation[] = [];
    const inputs: unknown[] = [];
    let frameCount = 0;

    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => ["seal_1", "seal_3"],
      getExpectedToken: () => "seal_1",
      mediaDevices,
      createVideoElement: () => video,
      pollIntervalMs: 100,
      frameRecognizer: () => {
        frameCount += 1;
        return frameCount === 1
          ? {
              token: null,
              confidence: 0,
              handDetected: false,
              stabilityMs: 0,
              reason: "no_hand"
            }
          : {
              token: "seal_1",
              confidence: 0.92,
              handDetected: true,
              stabilityMs: 700,
              reason: "recognized"
            };
      },
      onObservation: (observation, input) => {
        observations.push(observation);
        inputs.push(input);
      },
      onStatusChange: (status) => {
        statuses.push(status);
      }
    });

    await recognizer.start();

    expect(statuses).toEqual(["starting", "ready"]);
    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: "user"
      }
    });
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(observations[0]?.reason).toBe("no_hand");
    expect(inputs[0]).toBeNull();

    await vi.advanceTimersByTimeAsync(100);

    expect(observations[1]).toMatchObject({
      token: "seal_1",
      confidence: 0.92,
      handDetected: true,
      reason: "recognized"
    });
    expect(inputs[1]).toEqual({
      gesture: "seal_1",
      confidence: 0.92,
      source: "live_camera"
    });

    recognizer.stop();

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("stopped");
  });

  it("reports unsupported status when browser camera access is unavailable", async () => {
    const statuses: LiveGestureRecognizerStatus[] = [];
    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => ["seal_1"],
      getExpectedToken: () => "seal_1",
      mediaDevices: {} as Pick<MediaDevices, "getUserMedia">,
      onObservation: vi.fn(),
      onStatusChange: (status) => {
        statuses.push(status);
      }
    });

    await recognizer.start();

    expect(statuses).toEqual(["unsupported"]);
  });

  it("cancels a pending camera start when stopped before permission resolves", async () => {
    const track = {
      stop: vi.fn()
    } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track]
    } as unknown as MediaStream;
    let resolveStream: (stream: MediaStream) => void = () => undefined;
    const mediaDevices = {
      getUserMedia: vi.fn(
        () =>
          new Promise<MediaStream>((resolve) => {
            resolveStream = resolve;
          })
      )
    };
    const video = {
      muted: false,
      playsInline: false,
      srcObject: null,
      play: vi.fn(async () => undefined)
    } as unknown as HTMLVideoElement;
    const statuses: LiveGestureRecognizerStatus[] = [];
    const onObservation = vi.fn();

    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => ["seal_1"],
      getExpectedToken: () => "seal_1",
      mediaDevices,
      createVideoElement: () => video,
      onObservation,
      onStatusChange: (status) => {
        statuses.push(status);
      }
    });

    const startPromise = recognizer.start();
    expect(statuses).toEqual(["starting"]);

    recognizer.stop();
    resolveStream(stream);
    await startPromise;

    expect(statuses).toEqual(["starting", "stopped"]);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.play).not.toHaveBeenCalled();
    expect(onObservation).not.toHaveBeenCalled();
  });

  it("can retry after permission is denied and later recover to ready", async () => {
    const deniedError = Object.assign(new Error("denied"), {
      name: "NotAllowedError"
    });
    const track = {
      stop: vi.fn()
    } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track]
    } as unknown as MediaStream;
    const mediaDevices = {
      getUserMedia: vi.fn()
        .mockRejectedValueOnce(deniedError)
        .mockResolvedValueOnce(stream)
    };
    const video = {
      muted: false,
      playsInline: false,
      srcObject: null,
      play: vi.fn(async () => undefined)
    } as unknown as HTMLVideoElement;
    const statuses: LiveGestureRecognizerStatus[] = [];
    const runtime = {
      start: vi.fn(async () => ({
        recognizeFrame: () => ({
          token: null,
          confidence: 0,
          handDetected: false,
          stabilityMs: 0,
          reason: "no_hand" as const
        })
      }))
    };

    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => ["seal_1"],
      getExpectedToken: () => "seal_1",
      mediaDevices,
      createVideoElement: () => video,
      runtime,
      onObservation: vi.fn(),
      onStatusChange: (status) => {
        statuses.push(status);
      }
    });

    await recognizer.start();
    await recognizer.start();

    expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["starting", "blocked", "starting", "ready"]);
    expect(video.srcObject).toBe(stream);

    recognizer.stop();

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("stopped");
  });

  it("starts and stops the frame runtime session with the camera lifecycle", async () => {
    const track = {
      stop: vi.fn()
    } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track]
    } as unknown as MediaStream;
    const mediaDevices = {
      getUserMedia: vi.fn(async () => stream)
    };
    const video = {
      muted: false,
      playsInline: false,
      srcObject: null,
      play: vi.fn(async () => undefined)
    } as unknown as HTMLVideoElement;
    const stopSession = vi.fn();
    const recognizeFrame = vi.fn(() => ({
      token: null,
      confidence: 0,
      handDetected: false,
      stabilityMs: 0,
      reason: "no_hand" as const
    }));
    const runtime = {
      start: vi.fn(async ({ video: contextVideo }) => {
        expect(contextVideo).toBe(video);

        return {
          recognizeFrame,
          stop: stopSession
        };
      })
    };
    const statuses: LiveGestureRecognizerStatus[] = [];

    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => ["seal_1"],
      getExpectedToken: () => "seal_1",
      mediaDevices,
      createVideoElement: () => video,
      runtime,
      onObservation: vi.fn(),
      onStatusChange: (status) => {
        statuses.push(status);
      }
    });

    await recognizer.start();

    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(recognizeFrame).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["starting", "ready"]);

    recognizer.stop();

    expect(stopSession).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("stopped");
  });

  it("cleans up camera resources when runtime startup fails", async () => {
    const track = {
      stop: vi.fn()
    } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [track]
    } as unknown as MediaStream;
    const mediaDevices = {
      getUserMedia: vi.fn(async () => stream)
    };
    const video = {
      muted: false,
      playsInline: false,
      srcObject: null,
      play: vi.fn(async () => undefined)
    } as unknown as HTMLVideoElement;
    const statuses: LiveGestureRecognizerStatus[] = [];

    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => ["seal_1"],
      getExpectedToken: () => "seal_1",
      mediaDevices,
      createVideoElement: () => video,
      runtime: {
        start: vi.fn(async () => {
          throw new Error("runtime failed");
        })
      },
      onObservation: vi.fn(),
      onStatusChange: (status) => {
        statuses.push(status);
      }
    });

    await recognizer.start();

    expect(statuses).toEqual(["starting", "error"]);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
  });

  it("recognizes the expected token after stable browser frame signal", () => {
    const recognizer = createBrowserFrameSignalRecognizer({
      recognitionStableMs: 500,
      sampleFrame: () => ({
        hasFrame: true,
        signalScore: 0.82
      })
    });
    const video = {} as HTMLVideoElement;

    const firstObservation = recognizer({
      video,
      targetSequence: ["seal_1", "seal_3"],
      expectedToken: "seal_1",
      atMs: 1000
    });
    const stableObservation = recognizer({
      video,
      targetSequence: ["seal_1", "seal_3"],
      expectedToken: "seal_1",
      atMs: 1600
    });

    expect(firstObservation).toMatchObject({
      token: "seal_1",
      handDetected: true,
      stabilityMs: 0,
      reason: "unstable"
    });
    expect(stableObservation).toMatchObject({
      token: "seal_1",
      handDetected: true,
      stabilityMs: 600,
      reason: "recognized"
    });
    expect(stableObservation?.confidence).toBeGreaterThanOrEqual(0.65);
  });

  it("resets browser frame signal stability when frame activity drops", () => {
    const samples = [
      { hasFrame: true, signalScore: 0.78 },
      { hasFrame: true, signalScore: 0.78 },
      { hasFrame: true, signalScore: 0.01 },
      { hasFrame: true, signalScore: 0.78 }
    ];
    const recognizer = createBrowserFrameSignalRecognizer({
      recognitionStableMs: 400,
      sampleFrame: () => samples.shift() ?? { hasFrame: false, signalScore: 0 }
    });
    const video = {} as HTMLVideoElement;
    const frame = {
      video,
      targetSequence: ["seal_1"],
      expectedToken: "seal_1"
    };

    expect(recognizer({ ...frame, atMs: 0 })?.reason).toBe("unstable");
    expect(recognizer({ ...frame, atMs: 500 })?.reason).toBe("recognized");
    expect(recognizer({ ...frame, atMs: 600 })).toMatchObject({
      token: null,
      handDetected: false,
      stabilityMs: 0,
      reason: "no_hand"
    });
    expect(recognizer({ ...frame, atMs: 700 })).toMatchObject({
      token: "seal_1",
      handDetected: true,
      stabilityMs: 0,
      reason: "unstable"
    });
  });

  it("wraps the browser frame signal recognizer in a runtime session", async () => {
    const runtime = createBrowserFrameSignalRuntime({
      recognitionStableMs: 0,
      sampleFrame: () => ({
        hasFrame: true,
        signalScore: 0.9
      })
    });

    const session = await runtime.start({ video: {} as HTMLVideoElement });
    const observation = session.recognizeFrame({
      video: {} as HTMLVideoElement,
      targetSequence: ["seal_1"],
      expectedToken: "seal_1",
      atMs: 1000
    });

    expect(observation).toMatchObject({
      token: "seal_1",
      handDetected: true,
      reason: "recognized"
    });
  });

  it("classifies MediaPipe hand landmarks into gesture tokens", () => {
    const result = {
      landmarks: [createHandLandmarks("index_up")],
      handedness: [[{ score: 0.94, index: 0, categoryName: "Right", displayName: "Right" }]]
    };

    expect(classifyMediaPipeHandGesture(result, "index_up")).toEqual({
      token: "index_up",
      confidence: 0.94
    });
    expect(classifyMediaPipeHandGesture(result, "pinch")).toEqual({
      token: "index_up",
      confidence: 0.94
    });
  });

  it("uses a MediaPipe hand landmarker runtime with stable recognition", async () => {
    const close = vi.fn();
    const detectForVideo = vi.fn(() => ({
      landmarks: [createHandLandmarks("pinch")],
      worldLandmarks: [],
      handednesses: [],
      handedness: [[{ score: 0.91, index: 0, categoryName: "Right", displayName: "Right" }]]
    }));
    const runtime = createMediaPipeHandGestureRuntime({
      recognitionStableMs: 400,
      handLandmarkerLoader: async () => ({
        detectForVideo,
        close
      })
    });
    const video = {} as HTMLVideoElement;
    const session = await runtime.start({ video });

    const unstableObservation = session.recognizeFrame({
      video,
      targetSequence: ["pinch"],
      expectedToken: "pinch",
      atMs: 1000
    });

    expect(unstableObservation).toMatchObject({
      token: "pinch",
      handDetected: true,
      reason: "unstable"
    });
    expect(unstableObservation?.handLandmarks?.[0]?.[0]).toEqual(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
    );

    const recognizedObservation = session.recognizeFrame({
      video,
      targetSequence: ["pinch"],
      expectedToken: "pinch",
      atMs: 1500
    });

    expect(recognizedObservation).toMatchObject({
      token: "pinch",
      handDetected: true,
      reason: "recognized"
    });
    expect(recognizedObservation?.handLandmarks?.[0]?.[0]).toEqual(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
    );

    session.stop?.();

    expect(detectForVideo).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

function createHandLandmarks(shape: "index_up" | "pinch") {
  const landmarks = Array.from({ length: 21 }, (_, index) => ({
    x: 0.5 + index * 0.001,
    y: 0.7,
    z: 0,
    visibility: 1
  }));

  landmarks[0] = { x: 0.5, y: 0.82, z: 0, visibility: 1 };
  landmarks[4] = { x: shape === "pinch" ? 0.52 : 0.35, y: shape === "pinch" ? 0.32 : 0.52, z: 0, visibility: 1 };
  landmarks[6] = { x: 0.5, y: 0.48, z: 0, visibility: 1 };
  landmarks[8] = { x: shape === "pinch" ? 0.53 : 0.5, y: shape === "pinch" ? 0.33 : 0.24, z: 0, visibility: 1 };
  landmarks[10] = { x: 0.55, y: 0.52, z: 0, visibility: 1 };
  landmarks[12] = { x: 0.55, y: 0.6, z: 0, visibility: 1 };
  landmarks[14] = { x: 0.6, y: 0.54, z: 0, visibility: 1 };
  landmarks[16] = { x: 0.6, y: 0.62, z: 0, visibility: 1 };
  landmarks[18] = { x: 0.65, y: 0.56, z: 0, visibility: 1 };
  landmarks[20] = { x: 0.65, y: 0.64, z: 0, visibility: 1 };

  return landmarks;
}
