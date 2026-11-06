import { expect, pickTestChild, test } from "./helpers";

test.beforeEach(async ({ page }) => {
  await pickTestChild(page);
});

test.describe("Наблюдения", () => {
  test("дисклеймер — первый элемент контента, дальше блоки «Сон» и «Еда»", async ({ page }) => {
    await page.goto("/tips");

    // Ждём контент (сплэш-заглушка сменяется), затем проверяем порядок
    const disclaimer = page.getByText(/не медицинская рекомендация/);
    await expect(disclaimer).toBeVisible();

    // Дисклеймер стоит первым элементом контентного контейнера страницы
    const firstText = await page.evaluate(() => {
      const container = document.querySelector("main > div");
      const first = container?.firstElementChild;
      return first?.textContent ?? "";
    });
    expect(firstText, "дисклеймер не первый элемент страницы").toContain(
      "не медицинская рекомендация",
    );

    // Блоки-пилюли «Сон» и «Еда»
    await expect(page.getByText("Сон", { exact: true })).toBeVisible();
    await expect(page.getByText("Еда", { exact: true })).toBeVisible();
  });
});
