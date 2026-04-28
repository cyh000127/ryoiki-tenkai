import {
  createBrowserSpeechTranscriptRecognizer,
  type BrowserSpeechRecognitionStatus,
  type BrowserSpeechTranscriptRecognizer
} from "../../../shared/speech/browserSpeechRecognition";

export type JapaneseVoiceCommandDefinition = {
  label: string;
  aliases?: readonly string[];
};

export const JAPANESE_STARTUP_COMMANDS = [
  {
    label: "術式起動(술식기동)",
    aliases: ["術式起動", "術式を起動して", "じゅつしききどう"]
  },
  {
    label: "呪力起動(주력기동)",
    aliases: ["呪力起動", "じゅりょくきどう"]
  },
  {
    label: "結界展開(결계전개)",
    aliases: ["結界展開", "けっかいてんかい"]
  },
  {
    label: "封印解除(봉인해제)",
    aliases: ["封印解除", "ふういんかいじょ"]
  },
  {
    label: "開門(개문)",
    aliases: ["開門", "かいもん"]
  },
  {
    label: "解放(해방)",
    aliases: ["解放", "かいほう"]
  }
] as const satisfies readonly JapaneseVoiceCommandDefinition[];

export type JapaneseStartupCommand = string | JapaneseVoiceCommandDefinition;

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
  matchedCommand: string | null;
  status: "matched" | "rejected";
};

export type StartupVoiceCommandRecognizer = {
  start: () => Promise<boolean>;
  stop: () => void;
};

type StartupVoiceCommandRecognizerOptions = {
  commands?: readonly JapaneseStartupCommand[];
  lang?: string;
  onResult: (result: StartupVoiceRecognitionResult) => void;
  onStatusChange?: (status: StartupVoiceRecognitionStatus) => void;
};

const textNoisePattern = /[\s\u3000、。,.!！?？「」『』"“”‘’'・/\\|:：;；()[\]{}【】]/g;

export function normalizeJapaneseCommandText(text: string): string {
  return text.trim().toLocaleLowerCase("ja-JP").replace(textNoisePattern, "");
}

export function getJapaneseVoiceCommandLabel(command: JapaneseStartupCommand): string {
  return typeof command === "string" ? command : command.label;
}

export function matchJapaneseStartupCommand(
  transcript: string,
  commands: readonly JapaneseStartupCommand[] = JAPANESE_STARTUP_COMMANDS
): string | null {
  const normalizedTranscript = normalizeJapaneseCommandText(transcript);

  if (!normalizedTranscript) {
    return null;
  }

  const matchedCommand = commands.find((command) => {
    const normalizedAliases = resolveJapaneseVoiceCommandAliases(command).map(
      normalizeJapaneseCommandText
    );

    return normalizedAliases.some(
      (normalizedAlias) =>
        normalizedAlias.length > 0 && normalizedTranscript.includes(normalizedAlias)
    );
  });

  return matchedCommand ? getJapaneseVoiceCommandLabel(matchedCommand) : null;
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
          lang: options.lang ?? "ja-JP",
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

function resolveJapaneseVoiceCommandAliases(command: JapaneseStartupCommand): readonly string[] {
  if (typeof command === "string") {
    return [command];
  }

  return [command.label, ...(command.aliases ?? [])];
}
