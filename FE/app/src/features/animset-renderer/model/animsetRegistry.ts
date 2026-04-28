import { createHtmlFallbackRenderer } from "../adapters/htmlFallbackRenderer";
import { createUnityWebglRenderer } from "../adapters/unityWebglRenderer";
import type {
  AnimsetRendererKind,
  AnimsetRendererPort,
  RendererFallbackPolicy,
} from "./rendererPort";

export type AnimsetRendererDefinition = {
  animsetId: string;
  bridgeMethod?: string;
  bridgeTarget?: string;
  buildConfigUrl?: string;
  buildVersion: string;
  fallbackAnimsetId?: string;
  fallbackPolicy: RendererFallbackPolicy;
  rendererKind: AnimsetRendererKind;
};

const animsetRegistry: Record<string, AnimsetRendererDefinition> = {
  animset_basic_2d: {
    animsetId: "animset_basic_2d",
    buildVersion: "html-fallback-v1",
    fallbackPolicy: "html-fallback",
    rendererKind: "html-fallback"
  },
  animset_impact_2d: {
    animsetId: "animset_impact_2d",
    buildVersion: "html-fallback-v1",
    fallbackPolicy: "html-fallback",
    rendererKind: "html-fallback"
  },
  animset_unity_jjk: {
    animsetId: "animset_unity_jjk",
    bridgeMethod: "ReceiveEvent",
    bridgeTarget: "CodexBridge",
    buildConfigUrl: "/unity/ryoiki-tenkai-renderer/prototype-v1/build.json",
    buildVersion: "prototype-v1",
    fallbackAnimsetId: "animset_basic_2d",
    fallbackPolicy: "html-fallback",
    rendererKind: "unity-webgl"
  }
};

export function createAnimsetRenderer(definition: AnimsetRendererDefinition): AnimsetRendererPort {
  if (definition.rendererKind === "unity-webgl") {
    return createUnityWebglRenderer();
  }

  return createHtmlFallbackRenderer();
}

export function resolveAnimsetRendererDefinition(animsetId: string): AnimsetRendererDefinition {
  return animsetRegistry[animsetId] ?? animsetRegistry.animset_basic_2d;
}

export function resolveFallbackRendererDefinition(
  definition: AnimsetRendererDefinition
): AnimsetRendererDefinition {
  if (!definition.fallbackAnimsetId) {
    return animsetRegistry.animset_basic_2d;
  }

  return resolveAnimsetRendererDefinition(definition.fallbackAnimsetId);
}
