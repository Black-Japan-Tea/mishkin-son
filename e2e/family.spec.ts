import {
  expect,
  joinerEmail,
  JOINER_PASSWORD,
  NO_AUTH,
  pickTestChild,
  STORAGE_STATE,
  test,
} from "./helpers";

/**
 * Код приглашения живёт между тестами файла (workers=1, порядок алфавитный):
 * (а) создаёт код, (б) джойнер вступает по нему. Код действителен 24 часа.
 * При ретрае воркер перезапускается и модульное состояние теряется — джойнер-тест
 * умеет создать код самостоятельно отдельным контекстом основного аккаунта.
 */
let inviteCode = "";

/** Создаёт код приглашения из основного аккаунта (в переданном контексте). */
async function createInviteInContext(context: import("@playwright/test").BrowserContext): Promise<string> {
  const page = await context.newPage();
  await page.goto("/settings");
  await expect(page.getByText(/Семья: Тестовая семья/)).toBeVisible();
  await page.getByRole("button", { name: /Создать код приглашения|Новый код/ }).click();
  const codeText = page.locator("p.font-mono");
  await expect(codeText).toBeVisible();
  const code = ((await codeText.textContent()) ?? "").trim();
  await context.close();
  return code;
}

test.describe("Семья: основной аккаунт", () => {
  // clipboard-write нужен кнопке «Скопировать»
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("код приглашения виден, непуст и копируется", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/Семья: Тестовая семья/)).toBeVisible();
    await page.getByRole("button", { name: "Создать код приглашения" }).click();
    // Регресс бага «пустого кода»: код рендерится в моно-строке и не пуст
    const codeText = page.locator("p.font-mono");
    await expect(codeText).toBeVisible();
    const code = (await codeText.textContent()) ?? "";
    expect(code, `код приглашения пуст/некорректен: «${code}»`).toMatch(/^[0-9A-F]{6}$/);
    inviteCode = code;
    // Копирование: подпись кнопки меняется на «Скопировано»
    await page.getByRole("button", { name: "Скопировать" }).click();
    await expect(page.getByRole("button", { name: /Скопировано/ })).toBeVisible();
  });
});

test.describe("Семья: джойнер", () => {
  test.use({ storageState: NO_AUTH });

  test("джойнер вступает по коду и попадает на ГЛАВНУЮ (регресс бага №1)", async ({ page, browser }, testInfo) => {
    // Код из первого теста файла; после ретрая создаём заново отдельным контекстом
    if (inviteCode === "") {
      const mainContext = await browser.newContext({ storageState: STORAGE_STATE });
      inviteCode = await createInviteInContext(mainContext);
    }
    expect(inviteCode, "код приглашения пуст").toMatch(/^[0-9A-F]{6}$/);
    // Свежий аккаунт джойнера (уникальный email на попытку — ретрай не сломается)
    const email = joinerEmail("join", testInfo.retry);
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль (от 6 символов)").fill(JOINER_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await expect(page.getByText("Семья", { exact: true })).toBeVisible();

    // «По коду» → ввод кода основного аккаунта → «Вступить»
    await page.getByRole("button", { name: "По коду" }).click();
    await page.getByLabel("Код приглашения").fill(inviteCode);
    await page.getByRole("button", { name: "Вступить" }).click();

    // РЕГРЕСС БАГА №1: после вступления — главная, а не «Выбери малыша»
    await page.waitForURL("/");
    await expect(
      page.getByRole("navigation", { name: "Основная навигация" }),
    ).toBeVisible();
    await expect(page.getByText("Выбери малыша")).toHaveCount(0);

    // В /children видны оба ребёнка семьи; «Добавить малыша» — не единственное действие
    await pickTestChild(page);
    await page.goto("/children");
    await expect(page.getByText("Выбери малыша")).toBeVisible();
    await expect(page.getByRole("button", { name: "Е2Е Тест" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Мишка" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить малыша" })).toBeVisible();
  });

  test("неверный код: «Код не найден или истёк»", async ({ page }, testInfo) => {
    const email = joinerEmail("badcode", testInfo.retry);
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль (от 6 символов)").fill(JOINER_PASSWORD);
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await expect(page.getByText("Семья", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "По коду" }).click();
    await page.getByLabel("Код приглашения").fill("ZZZZ99");
    await page.getByRole("button", { name: "Вступить" }).click();
    // Сообщение RPC пробрасывается на экран с префиксом join_family: …
    await expect(page.getByText(/Код не найден или истёк/)).toBeVisible();
    // Джойнер остался без семьи — на экране «Семья»
    await expect(page).toHaveURL(/\/family$/);
  });
});
