import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-конфигурация «Мишкин сон».
 * Данные общие (одна Supabase-семья на все тесты) — fullyParallel: false, workers: 1,
 * порядок spec-файлов алфавитный, уборка за собой — в zz-cleanup.spec.ts (последний файл).
 */
export default defineConfig({
  testDir: "e2e",
  // Полный сценарий с реальным облаком может быть небыстрым
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Данные общие — тесты строго по одному
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://127.0.0.1:5173",
    // Скриншот/трейс только при падении — артефакты в test-results
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  // Dev-сервер поднимается сам; существующий не трогаем (reuseExistingServer)
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    // Отдельный setup-проект: логин через UI и сохранение storageState
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Мобильный вьюпорт приложения (эталон 390×844)
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        // Сессия тестового аккаунта, подготовленная setup-проектом
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
