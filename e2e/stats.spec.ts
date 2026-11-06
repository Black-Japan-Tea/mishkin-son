import { expect, pickTestChild, TEST_CHILD_BIRTH, test } from "./helpers";

/**
 * Реплика lib/advisor/norms.ts: норма сна зависит от возраста ребёнка.
 * «Е2Е Тест» (2026-01-01) — таблица до 12 мес: 720–900 мин → «12–15 ч».
 */
function expectedNormLabel(birthDate: string, now: Date): string {
  const birth = new Date(`${birthDate}T00:00:00`);
  const months = Math.max(0, (now.getTime() - birth.getTime()) / (86_400_000 * 30.4375));
  const total: [number, number] =
    months < 1 ? [840, 1020]
    : months < 3 ? [780, 960]
    : months < 6 ? [720, 960]
    : months < 9 ? [720, 900]
    : months < 12 ? [720, 900]
    : months < 18 ? [660, 840]
    : months < 36 ? [660, 840]
    : [600, 780];
  const f = Math.round((total[0] / 60) * 10) / 10;
  const t = Math.round((total[1] / 60) * 10) / 10;
  return `${f}–${t} ч`;
}

test.beforeEach(async ({ page }) => {
  await pickTestChild(page);
});

test.describe("Статистика", () => {
  test("заголовки, норма ВОЗ, среднее и отрисованные графики", async ({ page }) => {
    await page.goto("/stats");

    // Секции
    await expect(page.getByText("Сон по дням", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Кормления", { exact: false }).first()).toBeVisible();

    // Подписи: норма ВОЗ (по возрасту ребёнка) и «среднее»
    const norm = expectedNormLabel(TEST_CHILD_BIRTH, new Date());
    await expect(page.getByText(`норма ВОЗ ${norm}`)).toBeVisible();
    await expect(page.getByText(/среднее за период/)).toBeVisible();
    await expect(page.getByText(/Средний сон за период/)).toBeVisible();

    // Графики отрисованы: canvas в секциях сна и кормлений имеет ненулевой размер
    const sleepCanvas = page
      .locator("section")
      .filter({ hasText: "Сон по дням" })
      .locator("canvas");
    await expect(sleepCanvas).toBeVisible();
    const sleepSize = await sleepCanvas.evaluate((el) => ({
      w: (el as HTMLCanvasElement).width,
      h: (el as HTMLCanvasElement).height,
    }));
    expect(sleepSize.w, "canvas сна не отрисован").toBeGreaterThan(0);
    expect(sleepSize.h, "canvas сна не отрисован").toBeGreaterThan(0);

    const feedsCanvas = page
      .locator("section")
      .filter({ hasText: "Кормления" })
      .locator("canvas");
    await expect(feedsCanvas).toBeVisible();
  });

  test("переключатель 7/14 дней реально меняет график", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByRole("button", { name: "7 дней" })).toBeVisible();

    const sleepCanvas = page
      .locator("section")
      .filter({ hasText: "Сон по дням" })
      .locator("canvas");
    await expect(sleepCanvas).toBeVisible();
    // Ждём завершения анимации 500 мс и снимаем отрисовку 7 дней
    await page.waitForTimeout(1200);
    const before = await sleepCanvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

    await page.getByRole("button", { name: "14 дней" }).click();
    // Пересборка + анимация: подписи осей меняются (7 дней — пн–вс, 14 — числа)
    await page.waitForTimeout(1500);
    const after = await sleepCanvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
    expect(after, "переключатель 7/14 не изменил отрисовку графика").not.toBe(before);
  });
});
