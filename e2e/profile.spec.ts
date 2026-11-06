import { expect, pickTestChild, TEST_CHILD_NAME, test } from "./helpers";

test.beforeEach(async ({ page }) => {
  await pickTestChild(page);
});

test.describe("Профиль малыша (Е2Е Тест)", () => {
  test("поля формы «Данные малыша» сохраняются и переживают перезагрузку", async ({ page }) => {
    await page.goto("/child");
    await expect(page.getByText("Данные малыша")).toBeVisible();

    // Текущее имя — наш тестовый ребёнок; меняем вес при рождении и сохраняем
    const nameInput = page.getByLabel("Имя");
    await expect(nameInput).toHaveValue(TEST_CHILD_NAME);
    const weightInput = page.getByLabel("Вес при рождении, г");
    await weightInput.fill("3400");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();

    // Перезагрузка: значение на месте
    await page.reload();
    await expect(page.getByLabel("Имя")).toHaveValue(TEST_CHILD_NAME);
    await expect(page.getByLabel("Вес при рождении, г")).toHaveValue("3400");
  });

  test("валидация «Укажи пол малыша» при добавлении нового без пола", async ({ page }) => {
    await page.goto("/children");
    await expect(page.getByText("Выбери малыша")).toBeVisible();
    await page.getByRole("button", { name: "Добавить малыша" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Новый малыш")).toBeVisible();
    await page.getByLabel("Имя").fill("Е2Е Черновик");
    await page.getByLabel("Дата рождения").fill("2026-02-02");
    // Пол НЕ выбираем — сохранение должно отклониться
    await dialog.getByRole("button", { name: "Добавить малыша" }).click();
    await expect(page.getByText("Укажи пол малыша")).toBeVisible();
    // Ребёнок не создан: закрываем диалог
    await dialog.getByRole("button", { name: "Закрыть" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: "Е2Е Черновик" })).toHaveCount(0);
  });

  test("измерение веса: строка появляется и удаляется; блок «Кривые развития (ВОЗ)» на месте", async ({ page }) => {
    await page.goto("/child");
    await expect(page.getByText("Измерения")).toBeVisible();
    await expect(page.getByText("Кривые развития (ВОЗ)")).toBeVisible();

    // Добавляем вес 8.5 кг
    await page.getByLabel("Вес, кг").fill("8.5");
    await page.getByRole("button", { name: "+", exact: true }).click();
    const row = page.locator("div.rounded-xl").filter({ hasText: "Вес, кг: 8.5" }).first();
    await expect(row).toBeVisible();

    // График ВОЗ отрисован (recharts SVG)
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();

    // Прибралось: удаляем измерение крестиком
    await row.getByRole("button", { name: "Удалить измерение" }).click();
    await expect(row).toHaveCount(0);
  });
});
