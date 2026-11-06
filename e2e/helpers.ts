import {
  expect,
  test as base,
  type ConsoleMessage,
  type Locator,
  type Page,
} from "@playwright/test";

// ─────────────────────────── Константы аккаунта и данных ───────────────────────────

/** Тестовый аккаунт владельца («Тестовая семья»); ребёнок «Мишка» — реальная запись, НЕ ТРОГАТЬ. */
export const TEST_EMAIL = "mishkin.son.test2@gmail.com";
export const TEST_PASSWORD = "TestNight2026!";
export const TEST_CHILD_NAME = "Е2Е Тест";
export const TEST_CHILD_BIRTH = "2026-01-01";
/** Имя защищённого ребёнка — в тестах его никогда не выбираем и не редактируем. */
export const PROTECTED_CHILD_NAME = "Мишка";

export const STORAGE_STATE = "e2e/.auth/user.json";

/** Пустой storageState — «разлогиненный» контекст для auth/routes/family-сценариев. */
export const NO_AUTH: { cookies: []; origins: [] } = { cookies: [], origins: [] };

/** Идентификатор прогона: уникальные джойнер-аккаунты на каждый запуск. */
export const RUN_ID = Date.now().toString(36);
export const JOINER_PASSWORD = "TestJoin2026!";

/** Email джойнера с попыткой запуска в имени: ретрай получает свежий аккаунт. */
export function joinerEmail(scope: string, retry: number): string {
  return `e2e.joiner.${RUN_ID}.${scope}.r${retry}@test.local`;
}

// ─────────────────────────── Сбор ошибок консоли всего прогона ───────────────────────────

// workers=1 → все spec-файлы одного прогона живут в одном воркер-процессе,
// модуль-состояние общее: копим ошибки уровня error со всех тестов сюда.
const consoleErrorsAll: string[] = [];

export function getConsoleErrors(): readonly string[] {
  return consoleErrorsAll;
}

export const test = base.extend<{ collectConsole: void }>({
  // eslint-disable-next-line no-empty-pattern
  collectConsole: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      const onConsole = (msg: ConsoleMessage): void => {
        if (msg.type() !== "error") return;
        const loc = msg.location();
        errors.push(`${msg.text()} [url: ${loc?.url ?? "?"}]`);
      };
      const onPageError = (err: Error): void => {
        errors.push(`pageerror: ${err.message}`);
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      await use();
      if (errors.length > 0) {
        for (const line of errors) consoleErrorsAll.push(`${testInfo.title} :: ${line}`);
        await testInfo.attach("console-errors", {
          body: errors.join("\n"),
          contentType: "text/plain",
        });
      }
    },
    { auto: true },
  ],
});

export { expect };

// ─────────────────────────── Селекторы и сценарные шаги ───────────────────────────

/** Логин через UI: форма /login → редирект на главную. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL("/");
}

/** Регистрация через UI: заполняет форму /register и жмёт «Создать аккаунт». */
export async function registerViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль (от 6 символов)").fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
}

/**
 * Гарантированно свежий аккаунт: регистрация, а если email уже занят — логин.
 * Используется для джойнеров; уникальный email на попытку делает ветку предсказуемой.
 */
export async function ensureAccount(page: Page, email: string, password: string): Promise<void> {
  await registerViaUi(page, email, password);
  const already = page.getByText("Пользователь с таким email уже есть.");
  const registered = await already
    .waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (registered) {
    await loginViaUi(page, email, password);
  } else {
    // Свежая регистрация: без семьи → экран «Семья»
    await expect(page.getByText("Семья", { exact: true })).toBeVisible();
  }
}

/** Страница /children: заголовок выбора малыша. */
export function childPickHeading(page: Page): Locator {
  return page.getByText("Выбери малыша");
}

/**
 * Выбирает «Е2Е Тест» активным ребёнком. Обязательно перед сценариями с данными:
 * в свежем контексте активным по умолчанию становится первый в списке (может быть «Мишка»).
 */
export async function pickTestChild(page: Page): Promise<void> {
  await page.goto("/children");
  await childPickHeading(page).waitFor({ state: "visible", timeout: 30_000 });
  await page
    .getByRole("button", { name: TEST_CHILD_NAME })
    .first()
    .click();
  await page.waitForURL("/");
  // Активный ребёнок применился: шапка показывает его имя
  await expect(
    page.getByRole("button", { name: new RegExp(TEST_CHILD_NAME) }).first(),
  ).toBeVisible();
}

/**
 * Создаёт «Е2Е Тест» через UI, если его ещё нет (валидацию пола проходим выбором «Мальчик»).
 * Вызывается один раз в setup-проекте: ребёнок живёт в облаке между прогонами.
 */
export async function ensureTestChild(page: Page): Promise<void> {
  await page.goto("/children");
  await childPickHeading(page).waitFor({ state: "visible", timeout: 30_000 });
  const card = page.getByRole("button", { name: TEST_CHILD_NAME });
  if ((await card.count()) > 0) {
    await card.first().click();
    await page.waitForURL("/");
    return;
  }
  await page.getByRole("button", { name: "Добавить малыша" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Новый малыш").waitFor({ state: "visible" });
  await page.getByLabel("Имя").fill(TEST_CHILD_NAME);
  await page.getByLabel("Дата рождения").fill(TEST_CHILD_BIRTH);
  await dialog.getByRole("button", { name: "Мальчик" }).click();
  await dialog.getByRole("button", { name: "Добавить малыша" }).click();
  // После сохранения приложение само выбирает ребёнка и ведёт на главную
  await page.waitForURL("/");
}

// ─────────────────────────── Оверлеи главной ───────────────────────────

const SHEET_TITLES = {
  Сон: "Укладываем спать",
  Еда: "Кормление",
  Подгузник: "Подгузник",
} as const;

export type SheetName = keyof typeof SHEET_TITLES;

/** Открывает шит быстрого действия главной («Сон» / «Еда» / «Подгузник») и ждёт его. */
export async function openSheet(page: Page, name: SheetName): Promise<Locator> {
  await page.getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByText(SHEET_TITLES[name])
    .first()
    .waitFor({ state: "visible" });
  return dialog;
}

/** Закрывает открытый оверлей крестиком и ждёт завершения exit-анимации. */
export async function closeOverlay(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Закрыть" }).click();
  await expect(dialog).toBeHidden();
}

// ─────────────────────────── Лента событий ───────────────────────────

/** Строка ленты события по подстроке заголовка (кнопка .glass с <time> — плитки действий не совпадают). */
export function feedRow(page: Page, titlePart: string): Locator {
  return page
    .locator("main button.glass:has(time)")
    .filter({ hasText: titlePart })
    .first();
}

/** Все строки ленты на странице (история/главная): кнопки событий с <time>. */
export function feedRows(page: Page): Locator {
  return page.locator("main button.glass:has(time)");
}

/** Диалог события → «Удалить событие» → подтверждение «Удалить окончательно». */
export async function deleteEventRow(page: Page, row: Locator): Promise<void> {
  await row.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Событие", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Удалить событие" }).click();
  await dialog.getByRole("button", { name: "Удалить окончательно" }).click();
  await expect(dialog).toBeHidden();
}

/** Удаляет все строки ленты на открытом дне (используется при уборке). */
export async function deleteAllRowsOnDay(page: Page): Promise<void> {
  for (let i = 0; i < 30; i += 1) {
    const rows = feedRows(page);
    if ((await rows.count()) === 0) return;
    await deleteEventRow(page, rows.first());
  }
}

/** Удаляет ВСЕ события с данным подзаголовком (страховка от остатков после падений/ретраев). */
export async function deleteAllRowsByTitle(page: Page, titlePart: string): Promise<void> {
  for (let i = 0; i < 15; i += 1) {
    const row = feedRow(page, titlePart);
    if ((await row.count()) === 0) return;
    await deleteEventRow(page, row);
  }
}

// ─────────────────────────── Проверка переполнения ───────────────────────────

/**
 * Жалоба №3: нет горизонтального переполнения.
 * 1) scrollWidth документа не больше innerWidth;
 * 2) диалоговые/фиксированные контейнеры в границах вьюпорта ±2px.
 * Нюанс (находка для владельца): при открытом Radix-диалоге библиотека ставит body
 * overflow:hidden — sticky-шапка на время диалога дезактивируется и уходит на
 * «натуральную» позицию (скрыта за скримом). Поэтому шапка проверяется только
 * в состояниях без открытых оверлеев; сами оверлеи проверяются по их границам.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect(async () => {
    const m = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const doc = document.scrollingElement;
      const offenders: string[] = [];
      const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
      // Шапка участвует в проверке только без оверлеев (см. комментарий выше)
      const selector =
        openDialogs.length > 0
          ? '[role="dialog"][data-state="open"]'
          : '[role="dialog"][data-state="open"], nav[aria-label="Основная навигация"], header';
      const nodes = document.querySelectorAll(selector);
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.left < -2 || r.top < -2 || r.right > vw + 2 || r.bottom > vh + 2) {
          const cls = el.getAttribute("class") ?? "";
          offenders.push(
            `${el.tagName}[${cls.slice(0, 50)}] rect=${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)} viewport=${vw}x${vh}`,
          );
        }
      });
      return { sw: doc?.scrollWidth ?? 0, vw, offenders };
    });
    expect(
      m.sw,
      `горизонтальный скролл: scrollWidth=${m.sw} > innerWidth=${m.vw}`,
    ).toBeLessThanOrEqual(m.vw);
    expect(m.offenders, `за пределами вьюпорта: ${m.offenders.join("; ")}`).toEqual([]);
  }).toPass();
}

/** Скриншот-артефакт на крайних вьюпортах (320 и 430) в test-results. */
export async function snapshotAtEdge(page: Page, name: string, width: number): Promise<void> {
  if (width !== 320 && width !== 430) return;
  await page.screenshot({ path: `test-results/overflow/${width}-${name}.png` });
}
