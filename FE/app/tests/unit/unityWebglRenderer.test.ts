import { describe, expect, it } from "vitest";

import { validateUnityBuildVersion } from "../../src/features/animset-renderer/adapters/unityWebglRenderer";

describe("unityWebglRenderer", () => {
  it("allows a Unity build that matches the registered build version", () => {
    expect(() =>
      validateUnityBuildVersion({ productVersion: "prototype-v1" }, "prototype-v1")
    ).not.toThrow();
  });

  it("allows old mock builds that do not expose a product version", () => {
    expect(() => validateUnityBuildVersion({}, "prototype-v1")).not.toThrow();
  });

  it("blocks a Unity build with a mismatched product version", () => {
    expect(() =>
      validateUnityBuildVersion({ productVersion: "prototype-v0" }, "prototype-v1")
    ).toThrow("Unity build version mismatch");
  });
});
