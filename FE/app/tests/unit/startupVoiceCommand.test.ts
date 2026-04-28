import {
  createJapaneseStartupVoiceCommandRecognizer,
  matchJapaneseStartupCommand,
  normalizeJapaneseCommandText,
  type StartupVoiceRecognitionResult,
  type StartupVoiceRecognitionStatus
} from "../../src/features/gesture-session/model/startupVoiceCommand";
import type { BrowserSpeechRecognitionConstructor } from "../../src/shared/speech/browserSpeechRecognition";

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
    instances,
    win: {
      SpeechRecognition: Constructor as unknown as BrowserSpeechRecognitionConstructor
    } as unknown as Window
  };
}

describe("startupVoiceCommand", () => {
  it("normalizes Japanese command text for punctuation and spacing", () => {
    expect(normalizeJapaneseCommandText("  術式 を 起動して！ ")).toBe("術式を起動して");
  });

  it("matches registered commands contained in a Japanese transcript", () => {
    expect(matchJapaneseStartupCommand("術式を起動して")).toBe("起動して");
    expect(matchJapaneseStartupCommand("これから開門します")).toBe("開門");
    expect(matchJapaneseStartupCommand("こんにちは")).toBeNull();
  });

  it("reports unsupported when no browser speech recognizer exists", async () => {
    const statuses: StartupVoiceRecognitionStatus[] = [];
    const recognizer = createJapaneseStartupVoiceCommandRecognizer(
      {
        onResult: vi.fn(),
        onStatusChange: (status) => statuses.push(status)
      },
      {} as Window
    );

    await expect(recognizer.start()).resolves.toBe(false);
    expect(statuses).toEqual(["unsupported"]);
  });

  it("configures ja-JP recognition and emits a matched result", async () => {
    const { instances, win } = createMockRecognitionWindow();
    const statuses: StartupVoiceRecognitionStatus[] = [];
    const results: StartupVoiceRecognitionResult[] = [];
    const recognizer = createJapaneseStartupVoiceCommandRecognizer(
      {
        onResult: (result) => results.push(result),
        onStatusChange: (status) => statuses.push(status)
      },
      win
    );

    await expect(recognizer.start()).resolves.toBe(true);

    expect(instances[0].lang).toBe("ja-JP");
    expect(instances[0].interimResults).toBe(false);
    expect(instances[0].maxAlternatives).toBe(1);
    expect(instances[0].start).toHaveBeenCalledTimes(1);

    instances[0].onresult?.({
      results: {
        length: 1,
        0: {
          length: 1,
          0: {
            transcript: "術式を起動して"
          }
        }
      }
    });

    expect(results).toEqual([
      {
        matchedCommand: "起動して",
        status: "matched",
        transcript: "術式を起動して"
      }
    ]);
    expect(statuses).toEqual(["listening", "matched"]);
  });

  it("maps permission errors to blocked state", async () => {
    const { instances, win } = createMockRecognitionWindow();
    const statuses: StartupVoiceRecognitionStatus[] = [];
    const recognizer = createJapaneseStartupVoiceCommandRecognizer(
      {
        onResult: vi.fn(),
        onStatusChange: (status) => statuses.push(status)
      },
      win
    );

    await recognizer.start();
    instances[0].onerror?.({ error: "not-allowed" });

    expect(statuses).toEqual(["listening", "blocked"]);
  });
});
