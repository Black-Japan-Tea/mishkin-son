import { expect, TEST_EMAIL, test } from "./helpers";

async function isDark(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
}

test.describe("Настройки", () => {
  test("4 режима темы переключают класс .dark на <html>", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Тема", { exact: true })).toBeVisible();

    // Светлая: .dark снят
    await page.getByRole("button", { name: "Светлая" }).click();
    await expect.poll(() => isDark(page)).toBe(false);

    // Тёмная: .dark добавлен
    await page.getByRole("button", { name: "Тёмная" }).click();
    await expect.poll(() => isDark(page)).toBe(true);

    // Системная: следит за prefers-color-scheme (эмулируем оба значения)
    await page.getByRole("button", { name: "Системная" }).click();
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => isDark(page)).toBe(false);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => isDark(page)).toBe(true);
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => isDark(page)).toBe(false);

    // По часам: окно 00:00–23:59 всегда тёмное
    await page.getByRole("button", { name: "По часам" }).click();
    await page.getByLabel("Тёмная с").fill("00:00");
    await page.getByLabel("до", { exact: true }).fill("23:59");
    await expect.poll(() => isDark(page)).toBe(true);

    // Возврат к исходному состоянию аккаунта: системный режим и стандартное расписание
    await page.getByRole("button", { name: "По часам" }).click();
    await page.getByLabel("Тёмная с").fill("22:00");
    await page.getByLabel("до", { exact: true }).fill("07:00");
    await page.getByRole("button", { name: "Системная" }).click();
    await expect.poll(() => isDark(page)).toBe(false);
  });

  test("синк-кнопка, экспорт JSON, экспорт/очистка журнала и участники семьи", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Синхронизация")).toBeVisible();

    // Участник семьи виден строкой (email тестового аккаунта — в списке участников и в «Аккаунте»)
    await expect(page.getByText(TEST_EMAIL).first()).toBeVisible();

    // Синк: статус до/после не падает, ошибка синка не показывается
    await expect(page.getByText(/Не синхронизировано:/)).toBeVisible();
    await page.getByRole("button", { name: "Синхронизировать" }).click();
    await expect(page.getByText("Синхронизация")).toBeVisible();
    await expect(page.getByText(/Не синхронизировано:/)).toBeVisible();

    // Экспорт данных: событие download с именем mishkin-son-export-YYYY-MM-DD.json
    const dataDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Экспортировать JSON" }).click();
    expect((await dataDownload).suggestedFilename()).toMatch(
      /^mishkin-son-export-\d{4}-\d{2}-\d{2}\.json$/,
    );

    // Экспорт журнала: mishkin-log-YYYY-MM-DD.json
    const logDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Экспорт журнала" }).click();
    expect((await logDownload).suggestedFilename()).toMatch(
      /^mishkin-log-\d{4}-\d{2}-\d{2}\.json$/,
    );

    // Очистка журнала: без ошибок, экран жив
    await page.getByRole("button", { name: "Очистить журнал" }).click();
    await expect(page.getByRole("button", { name: "Очистить журнал" })).toBeVisible();
    await expect(page.getByText("Тема", { exact: true })).toBeVisible();
  });
});
