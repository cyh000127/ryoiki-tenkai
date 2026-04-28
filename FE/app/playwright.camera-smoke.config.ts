import { defineConfig } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const useRealCamera = process.env.LIVE_CAMERA_SMOKE_REAL_DEVICE === "true";
const cameraArgs = [
  "--autoplay-policy=no-user-gesture-required",
  "--use-fake-ui-for-media-stream",
  ...(useRealCamera ? [] : ["--use-fake-device-for-media-stream"])
];

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: /.*\.smoke\.ts/,
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 5174",
    cwd: appDir,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:5174"
  },
  projects: [
    {
      name: "camera-permission-smoke",
      use: {
        browserName: "chromium",
        launchOptions: {
          args: cameraArgs
        }
      }
    }
  ]
});
