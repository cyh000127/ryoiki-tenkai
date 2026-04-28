import {
  createBrowserSpeechTranscriptRecognizer,
  type BrowserSpeechRecognitionStatus,
  type BrowserSpeechTranscriptRecognizer
} from "../../../shared/speech/browserSpeechRecognition";

export const JAPANESE_STARTUP_COMMANDS = [
  "起動して",
  "スタート",
  "始めて",
  "開始",
  "エンジンをかけて",
  "結界展開",
  "術式起動",
  "呪力起動",
  "封印解除",
  "開門",
  "解放"
] as const;

export type JapaneseStartupCommand = (typeof JAPANESE_STARTUP_COMMANDS)[number] | string;

export type StartupVoiceRecognitionStatus =
  | "idle"
  | "listening"
  | "matched"
  | "rejected"
  | "unsupported"
  | "blocked"
  | "error";

export type StartupVoiceRecognitionResult = {
  transcript: string;
  matchedCommand: JapaneseStartupCommand | null;
  status: "matched" | "rejected";
};

export type StartupVoiceCommandRecognizer = {
  start: () => Promise<boolean>;
  stop: () => void;
};

type StartupVoiceCommandRecognizerOptions = {
  commands?: readonly JapaneseStartupCommand[];
  onResult: (result: StartupVoiceRecognitionResult) => void;
  onStatusChange?: (status: StartupVoiceRecognitionStatus) => void;
};

const textNoisePattern = /[\s\u3000、。,.!！?？「」『』"“”‘’'・/\\|:：;；()[\]{}【】]/g;

export function normalizeJapaneseCommandText(text: string): string {
  return text.trim().toLocaleLowerCase("ja-JP").replace(textNoisePattern, "");
}

export function matchJapaneseStartupCommand(
  transcript: string,
  commands: readonly JapaneseStartupCommand[] = JAPANESE_STARTUP_COMMANDS
): JapaneseStartupCommand | null {
  const normalizedTranscript = normalizeJapaneseCommandText(transcript);

  if (!normalizedTranscript) {
    return null;
  }

  return (
    commands.find((command) => {
      const normalizedCommand = normalizeJapaneseCommandText(command);
      return normalizedCommand.length > 0 && normalizedTranscript.includes(normalizedCommand);
    }) ?? null
  );
}

export function createJapaneseStartupVoiceCommandRecognizer(
  options: StartupVoiceCommandRecognizerOptions,
  win: Window | undefined = typeof window === "undefined" ? undefined : window
): StartupVoiceCommandRecognizer {
  let recognizer: BrowserSpeechTranscriptRecognizer | null = null;

  return {
    async start() {
      recognizer = createBrowserSpeechTranscriptRecognizer(
        {
          lang: "ja-JP",
          onEndWithoutTranscript: () => {
            options.onStatusChange?.("rejected");
          },
          onStatusChange: (status) => {
            options.onStatusChange?.(toStartupVoiceRecognitionStatus(status));
          },
          onTranscript: (transcript) => {
            handleTranscript(transcript, options);
          }
        },
        win
      );

      return recognizer.start();
    },
    stop() {
      recognizer?.stop();
      recognizer = null;
    }
  };
}

function handleTranscript(transcript: string, options: StartupVoiceCommandRecognizerOptions) {
  const matchedCommand = matchJapaneseStartupCommand(
    transcript,
    options.commands ?? JAPANESE_STARTUP_COMMANDS
  );
  const status = matchedCommand ? "matched" : "rejected";

  options.onResult({
    transcript,
    matchedCommand,
    status
  });
  options.onStatusChange?.(status);
}

function toStartupVoiceRecognitionStatus(
  status: BrowserSpeechRecognitionStatus
): StartupVoiceRecognitionStatus {
  if (status === "listening") {
    return "listening";
  }

  return status;
}
