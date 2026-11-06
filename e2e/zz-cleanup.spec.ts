import { type TestInfo } from "@playwright/test";
import {
  deleteAllRowsOnDay,
  expect,
  feedRows,
  getConsoleErrors,
  pickTestChild,
  test,
} from "./helpers";

/**
 * Уборка за прогоном (выполняется последним — имя файла с zz-префиксом).
 * Удаляем через UI все события «Е2Е Тест» за видимые месяцы.
 * Сам ребёнок остаётся: удаления детей в UI нет (документировано в отчёте).
 */
test("уборка: события Е2Е-ребёнка удалены, ошибки консоли собраны", async ({ page }, testInfo) => {
  await pickTestChild(page);
  await page.goto("/history");
  await expect(page.getByRole("button", { name: "Добавить событие" })).toBeVisible();

  // Чистим текущий и предыдущий месяц (события создаются «сегодня», но граница суток — страховка).
  // ВАЖНО: у «сегодня» точки-маркера нет по дизайну календаря (hasEvents && !today),
  // поэтому сегодняшний день открываем явно.
  for (let month = 0; month < 2; month += 1) {
    if (month === 1) {
      await page.getByRole("button", { name: "Прошлый месяц" }).click();
    } else {
      const todayCell = page.locator("button.bg-sleep");
      if ((await todayCell.count()) > 0) {
        await todayCell.first().click();
        await deleteAllRowsOnDay(page);
      }
    }
    for (let pass = 0; pass < 10; pass += 1) {
      const dotted = page.locator("button:has(span.bg-food)");
      if ((await dotted.count()) === 0) break;
      await dotted.first().click();
      await deleteAllRowsOnDay(page);
    }
  }

  // Контроль: в текущем месяце точек событий больше нет; сегодняшний день пуст
  await page.getByRole("button", { name: "Следующий месяц" }).click();
  await expect(page.locator("button:has(span.bg-food)")).toHaveCount(0);
  await expect(feedRows(page)).toHaveCount(0);

  // Сводка ошибок консоли (error) за весь прогон — workers=1, состояние модуля общее
  const errors = getConsoleErrors();
  const summary =
    errors.length > 0
      ? `=== Ошибки консоли (error) за прогон: ${errors.length} ===\n${errors.join("\n")}`
      : "=== Ошибок консоли (error) за прогон нет ===";
  // Печатаем в вывод прогона и прикладываем к отчёту
  console.log(`\n${summary}\n`);
  await attachText(testInfo, "console-errors-all.txt", summary);
});

async function attachText(testInfo: TestInfo, name: string, body: string): Promise<void> {
  await testInfo.attach(name, { body, contentType: "text/plain" });
}
