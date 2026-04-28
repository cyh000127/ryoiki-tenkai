import {
  createBrowserSpeechTranscriptRecognizer,
  getBrowserSpeechRecognitionConstructor,
  type BrowserSpeechRecognitionConstructor,
  type BrowserSpeechRecognitionStatus
} from "../../src/shared/speech/browserSpeechRecognition";

type MockRecognitionInstance = {
  continuous?: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult:
    | ((event: {
        results: {
          length: number;
          [index: number]:
            | {
                length: number;
                [index: number]: { transcript: string } | undefined;
              }
            | undefined;
        };
      }) => void)
    | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

function createMockRecognitionWindow() {
  const instances: MockRecognitionInstance[] = [];
  const Constructor = vi.fn(() => {
    const instance: MockRecognitionInstance = {
      interimResults: true,
      lang: "",
      maxAlternatives: 0,
      onend: null,
      onerror: null,
      onresult: null,
      start: vi.fn(),
      stop: vi.fn()
    };

    instances.push(instance);
    return instance;
  });

  return {
    constructor: Constructor,
    instances,
    win: {
      SpeechRecognition: Constructor as unknown as BrowserSpeechRecognitionConstructor
    } as unknown as Window
  };
}

describe("browserSpeechRecognition", () => {
  it("resolves browser speech recognition constructor when available", () => {
    const { constructor, win } = createMockRecognitionWindow();

    expect(getBrowserSpeechRecognitionConstructor(win)).toBe(constructor);
  });

  it("configures recognition and emits transcript through a reusable port", async () => {
    const { instances, win } = createMockRecognitionWindow();
    const statuses: BrowserSpeechRecognitionStatus[] = [];
    const transcripts: string[] = [];

    const recognizer = createBrowserSpeechTranscriptRecognizer(
      {
        lang: "ja-JP",
        onStatusChange: (status) => statuses.push(status),
        onTranscript: (transcript) => transcripts.push(transcript)
      },
      win
    );

    await expect(recognizer.start()).resolves.toBe(true);

    expect(instances[0].lang).toBe("ja-JP");
    expect(instances[0].interimResults).toBe(false);
    expect(instances[0].maxAlternatives).toBe(1);

    instances[0].onresult?.({
      results: {
        length: 1,
        0: {
          length: 1,
          0: {
            transcript: " 開始 "
          }
        }
      }
    });

    expect(statuses).toEqual(["listening"]);
    expect(transcripts).toEqual(["開始"]);
  });

  it("emits no-transcript callback when recognition ends without a result", async () => {
    const { instances, win } = createMockRecognitionWindow();
    const onEndWithoutTranscript = vi.fn();

    const recognizer = createBrowserSpeechTranscriptRecognizer(
      {
        lang: "ja-JP",
        onEndWithoutTranscript,
        onTranscript: vi.fn()
      },
      win
    );

    await recognizer.start();
    instances[0].onend?.();

    expect(onEndWithoutTranscript).toHaveBeenCalledTimes(1);
  });

  it("maps permission errors to blocked state", async () => {
    const { instances, win } = createMockRecognitionWindow();
    const statuses: BrowserSpeechRecognitionStatus[] = [];

    const recognizer = createBrowserSpeechTranscriptRecognizer(
      {
        lang: "ja-JP",
        onStatusChange: (status) => statuses.push(status),
        onTranscript: vi.fn()
      },
      win
    );

    await recognizer.start();
    instances[0].onerror?.({ error: "not-allowed" });

    expect(statuses).toEqual(["listening", "blocked"]);
  });
});
