import { describe, expect, it } from "vitest";

import {
  resolveAnimsetRendererDefinition,
  resolveFallbackRendererDefinition
} from "../../src/features/animset-renderer/model/animsetRegistry";

describe("animsetRegistry", () => {
  it("maps the Unity animset to a Unity WebGL renderer with html fallback", () => {
    const definition = resolveAnimsetRendererDefinition("animset_unity_jjk");

    expect(definition.rendererKind).toBe("unity-webgl");
    expect(definition.buildConfigUrl).toBe(
      "/unity/ryoiki-tenkai-renderer/prototype-v1/build.json"
    );
    expect(resolveFallbackRendererDefinition(definition).animsetId).toBe("animset_basic_2d");
  });

  it("keeps legacy animsets on the html fallback renderer", () => {
    const definition = resolveAnimsetRendererDefinition("animset_basic_2d");

    expect(definition.rendererKind).toBe("html-fallback");
    expect(definition.buildVersion).toBe("html-fallback-v1");
  });
});
