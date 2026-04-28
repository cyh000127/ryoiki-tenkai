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

type StartupSpeechRecognitionAlternative = {
  transcript: string;
};

type StartupSpeechRecognitionResult = {
  length: number;
  [index: number]: StartupSpeechRecognitionAlternative | undefined;
};

type StartupSpeechRecognitionResultList = {
  length: number;
  [index: number]: StartupSpeechRecognitionResult | undefined;
};

type StartupSpeechRecognitionResultEvent = {
  results: StartupSpeechRecognitionResultList;
};

type StartupSpeechRecognitionErrorEvent = {
  error?: string;
};

type StartupSpeechRecognition = {
  continuous?: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: StartupSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: StartupSpeechRecognitionResultEvent) => void) | null;
  abort?: () => void;
  start: () => void;
  stop: () => void;
};

export type StartupSpeechRecognitionConstructor = new () => StartupSpeechRecognition;

type StartupSpeechRecognitionWindow = Window & {
  SpeechRecognition?: StartupSpeechRecognitionConstructor;
  webkitSpeechRecognition?: StartupSpeechRecognitionConstructor;
};

const textNoisePattern = /[\s\u3000、。,.!！?？「」『』"“”‘’'・/\\|:：;；()[\]{}【】]/g;
const permissionErrorNames = new Set(["not-allowed", "service-not-allowed", "permission-denied"]);

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

export function getBrowserSpeechRecognitionConstructor(
  win: Window | undefined = typeof window === "undefined" ? undefined : window
): StartupSpeechRecognitionConstructor | null {
  if (!win) {
    return null;
  }

  const speechWindow = win as StartupSpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function createJapaneseStartupVoiceCommandRecognizer(
  options: StartupVoiceCommandRecognizerOptions,
  win: Window | undefined = typeof window === "undefined" ? undefined : window
): StartupVoiceCommandRecognizer {
  let recognition: StartupSpeechRecognition | null = null;
  let settled = false;
  let stopped = false;

  return {
    async start() {
      const RecognitionConstructor = getBrowserSpeechRecognitionConstructor(win);

      if (!RecognitionConstructor) {
        options.onStatusChange?.("unsupported");
        return false;
      }

      recognition = new RecognitionConstructor();
      recognition.lang = "ja-JP";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      settled = false;
      stopped = false;

      recognition.onresult = (event) => {
        const transcript = getFirstTranscript(event.results);
        const matchedCommand = matchJapaneseStartupCommand(
          transcript,
          options.commands ?? JAPANESE_STARTUP_COMMANDS
        );
        const status = matchedCommand ? "matched" : "rejected";

        settled = true;
        options.onResult({
          transcript,
          matchedCommand,
          status
        });
        options.onStatusChange?.(status);
      };

      recognition.onerror = (event) => {
        settled = true;
        options.onStatusChange?.(getErrorStatus(event.error));
      };

      recognition.onend = () => {
        recognition = null;

        if (!settled && !stopped) {
          options.onStatusChange?.("rejected");
        }
      };

      try {
        options.onStatusChange?.("listening");
        recognition.start();
        return true;
      } catch {
        settled = true;
        recognition = null;
        options.onStatusChange?.("error");
        return false;
      }
    },
    stop() {
      stopped = true;
      recognition?.stop();
      recognition = null;
    }
  };
}

function getFirstTranscript(results: StartupSpeechRecognitionResultList): string {
  for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
    const result = results[resultIndex];

    if (!result) {
      continue;
    }

    for (let alternativeIndex = 0; alternativeIndex < result.length; alternativeIndex += 1) {
      const transcript = result[alternativeIndex]?.transcript.trim();

      if (transcript) {
        return transcript;
      }
    }
  }

  return "";
}

function getErrorStatus(errorName: string | undefined): StartupVoiceRecognitionStatus {
  return errorName && permissionErrorNames.has(errorName) ? "blocked" : "error";
}
