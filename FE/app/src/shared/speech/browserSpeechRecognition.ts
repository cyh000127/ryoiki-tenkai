export type BrowserSpeechRecognitionStatus =
  | "listening"
  | "unsupported"
  | "blocked"
  | "error";

export type BrowserSpeechTranscriptRecognizer = {
  start: () => Promise<boolean>;
  stop: () => void;
};

type BrowserSpeechTranscriptRecognizerOptions = {
  lang: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onEndWithoutTranscript?: () => void;
  onStatusChange?: (status: BrowserSpeechRecognitionStatus) => void;
  onTranscript: (transcript: string) => void;
};

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative | undefined;
};

type BrowserSpeechRecognitionResultList = {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult | undefined;
};

type BrowserSpeechRecognitionResultEvent = {
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognitionErrorEvent = {
  error?: string;
};

type BrowserSpeechRecognition = {
  continuous?: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  abort?: () => void;
  start: () => void;
  stop: () => void;
};

export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserSpeechRecognitionWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

const permissionErrorNames = new Set(["not-allowed", "service-not-allowed", "permission-denied"]);

export function getBrowserSpeechRecognitionConstructor(
  win: Window | undefined = typeof window === "undefined" ? undefined : window
): BrowserSpeechRecognitionConstructor | null {
  if (!win) {
    return null;
  }

  const speechWindow = win as BrowserSpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function createBrowserSpeechTranscriptRecognizer(
  options: BrowserSpeechTranscriptRecognizerOptions,
  win: Window | undefined = typeof window === "undefined" ? undefined : window
): BrowserSpeechTranscriptRecognizer {
  let recognition: BrowserSpeechRecognition | null = null;
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
      recognition.lang = options.lang;
      recognition.interimResults = options.interimResults ?? false;
      recognition.maxAlternatives = options.maxAlternatives ?? 1;
      recognition.continuous = options.continuous ?? false;
      settled = false;
      stopped = false;

      recognition.onresult = (event) => {
        const transcript = getFirstTranscript(event.results);
        settled = true;
        options.onTranscript(transcript);
      };

      recognition.onerror = (event) => {
        settled = true;
        options.onStatusChange?.(getErrorStatus(event.error));
      };

      recognition.onend = () => {
        recognition = null;

        if (!settled && !stopped) {
          options.onEndWithoutTranscript?.();
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

function getFirstTranscript(results: BrowserSpeechRecognitionResultList): string {
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

function getErrorStatus(errorName: string | undefined): BrowserSpeechRecognitionStatus {
  return errorName && permissionErrorNames.has(errorName) ? "blocked" : "error";
}
