import {
  createBrowserLiveGestureRecognizer,
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

    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => ["seal_1"],
      getExpectedToken: () => "seal_1",
      mediaDevices,
      createVideoElement: () => video,
      onObservation: vi.fn(),
      onStatusChange: (status) => {
        statuses.push(status);
      }
    });

    await recognizer.start();
    await recognizer.start();

    expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
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
});
