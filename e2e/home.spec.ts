import {
  closeOverlay,
  deleteAllRowsByTitle,
  expect,
  feedRow,
  feedRows,
  openSheet,
  pickTestChild,
  test,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await pickTestChild(page);
});

test.describe("Главная", () => {
  test("старт дневного сна: таймер «00:00»-стиль → «Завершить» → событие в «Сегодня»", async ({ page }) => {
    // Предусловие: завершаем висящие активные сны и чистим остатки прошлых попыток
    const finish = page.getByRole("button", { name: "Завершить" });
    for (let i = 0; i < 5; i += 1) {
      const n = await finish.count();
      if (n === 0) break;
      await finish.first().click();
      // Активных снов может быть несколько — ждём уменьшения счётчика
      await expect(finish).toHaveCount(n - 1);
    }
    await deleteAllRowsByTitle(page, "Ночной сон");
    await deleteAllRowsByTitle(page, "Дневной сон");

    await openSheet(page, "Сон");
    // Ночью шит предвыбирает «Ночной» — для сценария явно выбираем дневной сон
    await page.getByRole("button", { name: "Дневной" }).click();
    await page.getByRole("button", { name: "Спать!" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Карточка-таймер: «ЧЧ:ММ» + «начался в HH:MM» + «Завершить» (секция сна, не строки ленты)
    const card = page.locator("section").filter({ hasText: "Дневной сон" });
    const timer = card.getByText(/^\d{2}:\d{2}$/);
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText(/^\d{2}:\d{2}$/);
    await expect(card.getByText("Дневной сон", { exact: true })).toBeVisible();
    await expect(card.getByText(/начался в \d{2}:\d{2}/)).toBeVisible();

    await page.getByRole("button", { name: "Завершить" }).click();
    await expect(timer).toHaveCount(0);

    // Событие появилось в «Сегодня»
    await expect(page.getByRole("heading", { name: "Сегодня" })).toBeVisible();
    await expect(feedRow(page, "Дневной сон")).toBeVisible();

    // Прибралось: удаляем событие (и остатки) через UI
    await deleteAllRowsByTitle(page, "Дневной сон");
  });

  test("еда: пустой объём — «Укажи объём в мл»", async ({ page }) => {
    const sheet = await openSheet(page, "Еда");
    await sheet.getByRole("button", { name: "Записать" }).click();
    await expect(page.getByText("Укажи объём в мл")).toBeVisible();
    // Ошибка не закрыла шит — запись не создана
    await expect(sheet.getByRole("button", { name: "Записать" })).toBeVisible();
    await closeOverlay(page);
  });

  test("бутылочка/прикорм/вода/порядок ленты + подгузник", async ({ page }) => {
    // 1) Бутылочка 54 мл смеси
    let sheet = await openSheet(page, "Еда");
    await sheet.getByRole("button", { name: "Бутылочка" }).click();
    await sheet.getByLabel("Объём, мл").fill("54");
    await sheet.getByRole("button", { name: "Смесь", exact: true }).click();
    await sheet.getByRole("button", { name: "Записать" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const row54 = feedRow(page, "Бутылочка: 54 мл смеси");
    await expect(row54).toBeVisible();
    // Время — ОДНИМ значением справа, без интервала
    await expect(row54.locator("time")).toHaveCount(1);
    await expect(row54.locator("time")).toHaveText(/^\d{2}:\d{2}$/);
    expect(await row54.textContent()).not.toContain("→");

    // 2) Прикорм «Кабачок» + 120 г
    sheet = await openSheet(page, "Еда");
    await sheet.getByRole("button", { name: "Прикорм" }).click();
    await sheet.getByLabel("Что ел").fill("Кабачок");
    await sheet.getByLabel("Сколько (необязательно)").fill("120");
    await sheet.getByRole("button", { name: "г", exact: true }).click();
    await sheet.getByRole("button", { name: "Записать" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(feedRow(page, "Прикорм: кабачок, 120 г")).toBeVisible();

    // 3) Вода через бутылочку (шит помнит «Прикорм» — возвращаем тип «Бутылочка»)
    sheet = await openSheet(page, "Еда");
    await sheet.getByRole("button", { name: "Бутылочка" }).click();
    await sheet.getByLabel("Объём, мл").fill("30");
    await sheet.getByRole("button", { name: "Вода", exact: true }).click();
    await sheet.getByRole("button", { name: "Записать" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(feedRow(page, "Бутылочка: 30 мл воды")).toBeVisible();

    // 4) Подгузник «Пописал»
    sheet = await openSheet(page, "Подгузник");
    await sheet.getByRole("button", { name: "Пописал" }).click();
    await sheet.getByRole("button", { name: "Записать" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(feedRow(page, "Подгузник: пописал")).toBeVisible();

    // 5) Порядок ленты: новое сверху — вторая бутылочка (60 мл) выше 54-й и первая в ленте
    sheet = await openSheet(page, "Еда");
    await sheet.getByRole("button", { name: "Бутылочка" }).click();
    // Шит помнит и тип, и вид бутылочки — возвращаем «Смесь»
    await sheet.getByRole("button", { name: "Смесь", exact: true }).click();
    await sheet.getByLabel("Объём, мл").fill("60");
    await sheet.getByRole("button", { name: "Записать" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    const row60 = feedRow(page, "Бутылочка: 60 мл смеси");
    await expect(row60).toBeVisible();
    const y54 = (await row54.boundingBox())?.y ?? Number.POSITIVE_INFINITY;
    const y60 = (await row60.boundingBox())?.y ?? Number.NEGATIVE_INFINITY;
    expect(y60, "новое событие не сверху ленты").toBeLessThan(y54);
    await expect(feedRows(page).first()).toHaveText(/Бутылочка: 60 мл смеси/);

    // Прибралось: удаляем все созданные события через UI (с учётом остатков ретраев)
    for (const title of [
      "Бутылочка: 60 мл смеси",
      "Бутылочка: 30 мл воды",
      "Подгузник: пописал",
      "Прикорм: кабачок, 120 г",
      "Бутылочка: 54 мл смеси",
    ]) {
      await deleteAllRowsByTitle(page, title);
    }
  });
});
