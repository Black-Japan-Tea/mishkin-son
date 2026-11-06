import { expect, loginViaUi, NO_AUTH, pickTestChild, TEST_EMAIL, TEST_PASSWORD, test } from "./helpers";

test.describe("Гость: редиректы и выход", () => {
  test.use({ storageState: NO_AUTH });

  test("неавторизованного любой защищённый маршрут редиректит на /login", async ({ page }) => {
    for (const route of ["/stats", "/", "/settings"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("выход: после logout защищённые маршруты снова ведут на /login; повторный вход работает", async ({ page }) => {
    await loginViaUi(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Сессия закрыта — все маршруты ведут на /login
    for (const route of ["/stats", "/", "/settings"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    }

    // Повторный вход в этом же контексте: после logout первый pull длиннее — ждём дольше
    await loginViaUi(page, TEST_EMAIL, TEST_PASSWORD);
    await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("Маршруты приложения (авторизован)", () => {
  test("неизвестный /xyz ведёт на главную", async ({ page }) => {
    await page.goto("/xyz");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Сегодня" })).toBeVisible();
  });

  test("каждый таб открывает свой экран с ожидаемыми признаками", async ({ page }) => {
    await pickTestChild(page);
    const nav = page.getByRole("navigation", { name: "Основная навигация" });

    // Статистика
    await nav.getByRole("button", { name: "Статистика" }).click();
    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.getByText("Сон по дням").first()).toBeVisible();
    await expect(page.getByText("Кормления").first()).toBeVisible();

    // История (календарь)
    await nav.getByRole("button", { name: "История" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByText("пн", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить событие" })).toBeVisible();

    // Советы (Наблюдения)
    await nav.getByRole("button", { name: "Советы" }).click();
    await expect(page).toHaveURL(/\/tips$/);
    await expect(page.getByRole("heading", { name: "Наблюдения" })).toBeVisible();

    // Профиль (Данные малыша)
    await nav.getByRole("button", { name: "Профиль" }).click();
    await expect(page).toHaveURL(/\/child$/);
    await expect(page.getByText("Данные малыша")).toBeVisible();

    // Настройки через шапку (Тема)
    await page.getByRole("button", { name: "Настройки" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByText("Тема", { exact: true })).toBeVisible();

    // Главная (Сегодня)
    await nav.getByRole("button", { name: "Главная" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Сегодня" })).toBeVisible();
  });
});
