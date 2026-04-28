import type {
  AnimsetRendererBridgeEvent,
  AnimsetRendererPort,
  RendererEventEnvelope,
  RendererMountOptions,
  RendererStatus
} from "../model/rendererPort";

type UnityInstanceLike = {
  Quit?: () => Promise<void>;
  SendMessage?: (gameObject: string, methodName: string, parameter?: string) => void;
  SetFullscreen?: (fullscreen: number) => void;
};

type UnityBuildConfig = {
  bridgeMethod?: string;
  bridgeTarget?: string;
  codeUrl?: string;
  companyName?: string;
  dataUrl?: string;
  frameworkUrl?: string;
  loaderUrl: string;
  productName?: string;
  productVersion?: string;
  streamingAssetsUrl?: string;
};

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: Record<string, unknown>,
      onProgress?: (progress: number) => void
    ) => Promise<UnityInstanceLike>;
  }
}

const loadedScripts = new Map<string, Promise<void>>();

export function createUnityWebglRenderer(): AnimsetRendererPort {
  let host: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let instance: UnityInstanceLike | null = null;
  let options: RendererMountOptions | null = null;
  let status: RendererStatus = "idle";
  let overlay: HTMLElement | null = null;

  function emit(event: AnimsetRendererBridgeEvent) {
    options?.onBridgeEvent?.(event);
  }

  function setStatus(nextStatus: RendererStatus, message?: string) {
    status = nextStatus;
    if (!overlay || !options) {
      return;
    }

    const detail = message ? ` · ${message}` : "";
    overlay.textContent = `Unity WebGL / ${options.scene} / ${nextStatus}${detail}`;
  }

  function createShell(target: HTMLElement) {
    const shell = document.createElement("div");
    shell.className = "animset-runtime animset-runtime--unity";

    const nextCanvas = document.createElement("canvas");
    nextCanvas.className = "animset-runtime__canvas";

    const nextOverlay = document.createElement("div");
    nextOverlay.className = "animset-runtime__overlay";

    shell.append(nextCanvas, nextOverlay);
    target.replaceChildren(shell);

    canvas = nextCanvas;
    overlay = nextOverlay;
  }

  return {
    getStatus() {
      return status;
    },
    async mount(target, mountOptions) {
      host = target;
      options = mountOptions;
      createShell(target);
      setStatus("loading");

      if (!mountOptions.buildConfigUrl) {
        setStatus("error", "missing build config");
        emit({
          payload: { message: "Unity build config is missing." },
          type: "renderer.error"
        });
        return;
      }

      try {
        const buildConfig = await loadBuildConfig(mountOptions.buildConfigUrl);
        const resolvedConfig = resolveBuildConfigUrls(buildConfig, mountOptions.buildConfigUrl);
        await loadScriptOnce(resolvedConfig.loaderUrl);

        if (!canvas || typeof window.createUnityInstance !== "function") {
          throw new Error("Unity loader is unavailable.");
        }

        instance = await window.createUnityInstance(
          canvas,
          {
            ...resolvedConfig,
            companyName: resolvedConfig.companyName ?? "Codex",
            productName: resolvedConfig.productName ?? "RyoikiTenkaiRenderer",
            productVersion: resolvedConfig.productVersion ?? mountOptions.buildVersion
          },
          (progress) => {
            setStatus("loading", `${Math.round(progress * 100)}%`);
          }
        );

        setStatus("ready");
        emit({ type: "renderer.ready" });
      } catch (error) {
        setStatus("error", "load failed");
        emit({
          payload: {
            message: error instanceof Error ? error.message : "Unknown Unity loader error."
          },
          type: "renderer.error"
        });
      }
    },
    async unmount() {
      const activeInstance = instance;
      instance = null;
      if (activeInstance?.Quit) {
        await activeInstance.Quit();
      }
      host?.replaceChildren();
      host = null;
      canvas = null;
      overlay = null;
      options = null;
      status = "idle";
    },
    update(event: RendererEventEnvelope) {
      if (!instance?.SendMessage || !options) {
        return;
      }

      try {
        instance.SendMessage(
          options.bridgeTarget ?? "CodexBridge",
          options.bridgeMethod ?? "ReceiveEvent",
          JSON.stringify(event)
        );
      } catch (error) {
        setStatus("error", "bridge failed");
        emit({
          payload: {
            message: error instanceof Error ? error.message : "Failed to send Unity bridge event."
          },
          type: "renderer.error"
        });
      }
    }
  };
}

async function loadBuildConfig(buildConfigUrl: string): Promise<UnityBuildConfig> {
  const response = await fetch(buildConfigUrl);
  if (!response.ok) {
    throw new Error(`Failed to load Unity build config: ${response.status}.`);
  }

  return (await response.json()) as UnityBuildConfig;
}

function resolveBuildConfigUrls(
  buildConfig: UnityBuildConfig,
  buildConfigUrl: string
): UnityBuildConfig {
  const baseUrl = new URL(buildConfigUrl, window.location.origin);
  const resolvedLoaderUrl = resolveRequiredUrl(buildConfig.loaderUrl, baseUrl);

  return {
    ...buildConfig,
    codeUrl: resolveUrl(buildConfig.codeUrl, baseUrl),
    dataUrl: resolveUrl(buildConfig.dataUrl, baseUrl),
    frameworkUrl: resolveUrl(buildConfig.frameworkUrl, baseUrl),
    loaderUrl: resolvedLoaderUrl,
    streamingAssetsUrl: resolveUrl(buildConfig.streamingAssetsUrl, baseUrl)
  };
}

function resolveUrl(value: string | undefined, baseUrl: URL): string | undefined {
  if (!value) {
    return undefined;
  }

  return new URL(value, baseUrl).toString();
}

function resolveRequiredUrl(value: string, baseUrl: URL): string {
  return new URL(value, baseUrl).toString();
}

function loadScriptOnce(url: string): Promise<void> {
  const existingPromise = loadedScripts.get(url);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Unity loader script: ${url}`));
    document.head.append(script);
  });

  loadedScripts.set(url, promise);
  return promise;
}
