import { afterEach, describe, expect, it, vi } from "vitest";

import { createUnityWebglRenderer } from "../../src/features/animset-renderer/adapters/unityWebglRenderer";
import type { AnimsetRendererBridgeEvent } from "../../src/features/animset-renderer/model/rendererPort";

describe("unityWebglRenderer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.createUnityInstance;
  });

  it("fails fast when the Unity build version mismatches the expected renderer version", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        loaderUrl: "/unity/mock-loader.js",
        productVersion: "prototype-v2"
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    window.createUnityInstance = vi.fn();
    const renderer = createUnityWebglRenderer();
    const host = document.createElement("div");
    const bridgeEvents: AnimsetRendererBridgeEvent[] = [];

    await renderer.mount(host, {
      animsetId: "animset_unity_jjk",
      buildConfigUrl: "/unity/ryoiki-tenkai-renderer/prototype-v1/build.json",
      buildVersion: "prototype-v1",
      fallbackPolicy: "html-fallback",
      onBridgeEvent: (event) => bridgeEvents.push(event),
      rendererKind: "unity-webgl",
      scene: "practice"
    });

    expect(renderer.getStatus()).toBe("error");
    expect(window.createUnityInstance).not.toHaveBeenCalled();
    expect(bridgeEvents).toEqual([
      {
        payload: {
          message: "Unity build version mismatch. expected prototype-v1, received prototype-v2."
        },
        type: "renderer.error"
      }
    ]);
  });

  it("mounts the Unity runtime when the build version matches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        loaderUrl: "/unity/mock-loader-success.js",
        productVersion: "prototype-v1"
      }),
      ok: true
    });
    vi.stubGlobal("fetch", fetchMock);

    const appendSpy = vi
      .spyOn(document.head, "append")
      .mockImplementation((...nodes: (Node | string)[]) => {
        for (const node of nodes) {
          if (node instanceof HTMLScriptElement) {
            queueMicrotask(() => {
              node.onload?.(new Event("load"));
            });
          }
        }
      });

    const createUnityInstance = vi.fn().mockResolvedValue({
      Quit: vi.fn(async () => undefined),
      SendMessage: vi.fn()
    });
    window.createUnityInstance = createUnityInstance;

    const renderer = createUnityWebglRenderer();
    const host = document.createElement("div");
    const bridgeEvents: AnimsetRendererBridgeEvent[] = [];

    await renderer.mount(host, {
      animsetId: "animset_unity_jjk",
      buildConfigUrl: "/unity/ryoiki-tenkai-renderer/prototype-v1/build.json",
      buildVersion: "prototype-v1",
      fallbackPolicy: "html-fallback",
      onBridgeEvent: (event) => bridgeEvents.push(event),
      rendererKind: "unity-webgl",
      scene: "practice"
    });

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(createUnityInstance).toHaveBeenCalledTimes(1);
    expect(renderer.getStatus()).toBe("ready");
    expect(bridgeEvents).toEqual([{ type: "renderer.ready" }]);
  });
});
