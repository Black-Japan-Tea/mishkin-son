import { expect, joinerEmail, JOINER_PASSWORD, NO_AUTH, test } from "./helpers";

// Сценарии входа/регистрации — без сохранённой сессии
test.use({ storageState: NO_AUTH });

test.describe("Аутентификация", () => {
  test("неверный пароль показывает «Неверный email или пароль.»", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("mishkin.son.test2@gmail.com");
    await page.getByLabel("Пароль", { exact: true }).fill("WrongPassword123");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByText("Неверный email или пароль.")).toBeVisible();
    // Ошибка — мы остаёмся на форме входа
    await expect(page).toHaveURL(/\/login$/);
  });

  test("регистрация: короткий пароль блокируется валидацией формы", async ({ page }, testInfo) => {
    const email = joinerEmail("shortpw", testInfo.retry);
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль (от 6 символов)").fill("123");
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    // Нативная валидация minLength=6: форма не отправляется, браузер показывает подсказку
    const message = await page
      .getByLabel("Пароль (от 6 символов)")
      .evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(message.length, "нативное сообщение валидации пусто").toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/register$/);
  });

  test("регистрация уникальным email приводит на экран «Семья»", async ({ page }, testInfo) => {
    const email = joinerEmail("auth", testInfo.retry);
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль (от 6 символов)").fill(JOINER_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    // Свежий аккаунт без семьи → гейт ведёт на /family
    await expect(page.getByText("Семья", { exact: true })).toBeVisible();
  });
});
