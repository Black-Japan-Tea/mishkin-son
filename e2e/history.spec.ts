import { deleteAllRowsByTitle, deleteEventRow, expect, feedRow, feedRows, pickTestChild, test } from "./helpers";

const MONTHS_RU = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

const MONTHS_GEN_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «7 ноября» для заголовка дня (родительный падеж месяца — как date-fns locale ru). */
function dayTitle(date: Date): string {
  return `${date.getDate()} ${MONTHS_GEN_RU[date.getMonth()] ?? ""}`;
}

test.beforeEach(async ({ page }) => {
  await pickTestChild(page);
});

test.describe("История", () => {
  test("календарь: месяц, подсветка сегодня, событие дня и удаление через диалог", async ({ page }) => {
    await page.goto("/history");
    // Сетка дней недели и заголовок текущего месяца (в DOM — нижний регистр, CSS делает капитель)
    await expect(page.getByText("пн", { exact: true })).toBeVisible();
    const now = new Date();
    const expectedMonth = `${MONTHS_RU[now.getMonth()]} ${now.getFullYear()}`;
    await expect(page.getByText(expectedMonth)).toBeVisible();

    // today подсвечен: ячейка с классом bg-sleep содержит сегодняшнее число
    const todayCell = await page.evaluate((day) => {
      const cells = [...document.querySelectorAll("button.bg-sleep")];
      return cells.some((b) => b.textContent === String(day));
    }, now.getDate());
    expect(todayCell, "сегодняшний день не подсвечен в календаре").toBe(true);

    // Событие задним числом сегодня: диалог «Добавить событие» → Бутылочка 77 мл
    await page.getByRole("button", { name: "Добавить событие" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Добавить событие").first()).toBeVisible();
    await dialog.getByRole("button", { name: "Бутылочка", exact: true }).click();
    await dialog.getByLabel("Объём, мл").fill("77");
    await dialog.getByRole("button", { name: "Добавить", exact: true }).click();
    await expect(dialog).toBeHidden();

    // Заголовок дня «7 ноября · сегодня» и строка события в ленте
    await expect(page.getByText(`${dayTitle(now)} · сегодня`)).toBeVisible();
    const row = feedRow(page, "Бутылочка: 77 мл смеси");
    await expect(row).toBeVisible();

    // Клик по событию → диалог редактирования → удаление с подтверждением
    await deleteEventRow(page, row);
    // Убираем и остатки тех же событий (ретраи), затем проверяем исчезновение
    await deleteAllRowsByTitle(page, "Бутылочка: 77 мл смеси");
    await expect(feedRows(page).filter({ hasText: "Бутылочка: 77 мл смеси" })).toHaveCount(0);
    // Пустой день: прочерк ленты виден, только если больше ничего за день не осталось
    if ((await feedRows(page).count()) === 0) {
      await expect(page.getByText("В этот день записей нет")).toBeVisible();
    }
  });

  test("навигация месяцев ← →", async ({ page }) => {
    await page.goto("/history");
    const now = new Date();
    await expect(page.getByText(`${MONTHS_RU[now.getMonth()]} ${now.getFullYear()}`)).toBeVisible();

    await page.getByRole("button", { name: "Прошлый месяц" }).click();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    await expect(
      page.getByText(`${MONTHS_RU[prev.getMonth()]} ${prev.getFullYear()}`),
    ).toBeVisible();

    await page.getByRole("button", { name: "Следующий месяц" }).click();
    await page.getByRole("button", { name: "Следующий месяц" }).click();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await expect(
      page.getByText(`${MONTHS_RU[next.getMonth()]} ${next.getFullYear()}`),
    ).toBeVisible();
  });
});
