import {
  closeOverlay,
  expect,
  openSheet,
  pickTestChild,
  test,
} from "./helpers";

// Диалоги и шиты: только открытие/закрытие, никаких записей (данные не создаём)
test.beforeEach(async ({ page }) => {
  await pickTestChild(page);
});

test.describe("Оверлеи", () => {
  test("шит «Еда»: оба типа (бутылочка и прикорм) открываются и закрываются", async ({ page }) => {
    const sheet = await openSheet(page, "Еда");
    await expect(sheet.getByRole("button", { name: "Бутылочка" })).toBeVisible();
    await expect(sheet.getByLabel("Объём, мл")).toBeVisible();
    // Переключение на прикорм: поля «Что ел» и «Сколько»
    await sheet.getByRole("button", { name: "Прикорм" }).click();
    await expect(sheet.getByLabel("Что ел")).toBeVisible();
    await expect(sheet.getByLabel("Сколько (необязательно)")).toBeVisible();
    await closeOverlay(page);
  });

  test("шит «Подгузник» открывается и закрывается", async ({ page }) => {
    const sheet = await openSheet(page, "Подгузник");
    await expect(sheet.getByRole("button", { name: "Пописал" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Покакал" })).toBeVisible();
    await closeOverlay(page);
  });

  test("шит «Сон» открывается и закрывается без старта сна", async ({ page }) => {
    const sheet = await openSheet(page, "Сон");
    await expect(sheet.getByRole("button", { name: "Дневной" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Ночной" })).toBeVisible();
    await expect(sheet.getByLabel("Место (необязательно)")).toBeVisible();
    await closeOverlay(page);
    // Сон не стартовал: карточки-таймера нет
    await expect(page.getByRole("button", { name: "Завершить" })).toHaveCount(0);
  });

  test("диалог «Добавить событие» открывается с Истории и закрывается", async ({ page }) => {
    await page.goto("/history");
    await page.getByRole("button", { name: "Добавить событие" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Добавить событие").first()).toBeVisible();
    // Типы события
    for (const type of ["Сон", "Бутылочка", "Прикорм", "Подгузник"]) {
      await expect(dialog.getByRole("button", { name: type, exact: true })).toBeVisible();
    }
    await closeOverlay(page);
  });

  test("диалог «Новый малыш» открывается со страницы детей и закрывается", async ({ page }) => {
    await page.goto("/children");
    await expect(page.getByText("Выбери малыша")).toBeVisible();
    await page.getByRole("button", { name: "Добавить малыша" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Новый малыш")).toBeVisible();
    await expect(page.getByLabel("Имя")).toBeVisible();
    await closeOverlay(page);
  });

  test("регресс R3: сразу после закрытия шита клик по таб-бару проходит", async ({ page }) => {
    await openSheet(page, "Еда");
    await closeOverlay(page);
    // Немедленный клик по табу: панель в exit-анимации не должна перехватывать указатель
    await page.getByRole("button", { name: "Статистика" }).click();
    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.getByText("Сон по дням")).toBeVisible();
  });
});
