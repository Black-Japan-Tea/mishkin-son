import {
  closeOverlay,
  expect,
  expectNoHorizontalOverflow,
  openSheet,
  pickTestChild,
  snapshotAtEdge,
  test,
} from "./helpers";

const VIEWPORTS: ReadonlyArray<{ width: number; height: number }> = [
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 920 },
];

/** Маршруты с признаком загрузки экрана. Публичные (/login /register /family) и защищённые. */
const ROUTES: ReadonlyArray<{ path: string; marker: string; name: string }> = [
  { path: "/login", marker: "Вход", name: "login" },
  { path: "/register", marker: "Регистрация", name: "register" },
  { path: "/family", marker: "Семья", name: "family" },
  { path: "/children", marker: "Выбери малыша", name: "children" },
  { path: "/", marker: "Сегодня", name: "home" },
  { path: "/history", marker: "Добавить событие", name: "history" },
  { path: "/stats", marker: "Сон по дням", name: "stats" },
  { path: "/tips", marker: "Наблюдения", name: "tips" },
  { path: "/child", marker: "Данные малыша", name: "child" },
  { path: "/settings", marker: "Тема", name: "settings" },
];

// Жалоба №3: ни на одном маршруте и ни в одном оверлее ничего не выезжает за экран
test.describe("Переполнение вьюпортов", () => {
  for (const vp of VIEWPORTS) {
    test(`маршруты без переполнения ${vp.width}x${vp.height}`, async ({ page }) => {
      // Активного ребёнка выбираем до смены вьюпорта
      await pickTestChild(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of ROUTES) {
        await page.goto(route.path);
        await expect(page.getByText(route.marker).first()).toBeVisible({ timeout: 30_000 });
        await expectNoHorizontalOverflow(page);
        await snapshotAtEdge(page, route.name, vp.width);
      }
    });

    test(`оверлеи без переполнения ${vp.width}x${vp.height}`, async ({ page }) => {
      await pickTestChild(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Шит «Еда»: бутылочка
      await page.goto("/");
      const food = await openSheet(page, "Еда");
      await expectNoHorizontalOverflow(page);
      await snapshotAtEdge(page, "sheet-food-bottle", vp.width);
      await food.getByRole("button", { name: "Прикорм" }).click();
      await expect(food.getByLabel("Что ел")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await snapshotAtEdge(page, "sheet-food-solid", vp.width);
      await closeOverlay(page);

      // Шит «Подгузник»
      await openSheet(page, "Подгузник");
      await expectNoHorizontalOverflow(page);
      await snapshotAtEdge(page, "sheet-diaper", vp.width);
      await closeOverlay(page);

      // Шит «Сон»
      await openSheet(page, "Сон");
      await expectNoHorizontalOverflow(page);
      await snapshotAtEdge(page, "sheet-sleep", vp.width);
      await closeOverlay(page);

      // Диалог «Добавить событие»
      await page.goto("/history");
      await page.getByRole("button", { name: "Добавить событие" }).click();
      await expect(page.getByRole("dialog").getByText("Добавить событие").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await snapshotAtEdge(page, "dialog-new-event", vp.width);
      await closeOverlay(page);

      // Диалог «Новый малыш»
      await page.goto("/children");
      await page.getByRole("button", { name: "Добавить малыша" }).click();
      await expect(page.getByRole("dialog").getByText("Новый малыш")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await snapshotAtEdge(page, "dialog-new-child", vp.width);
      await closeOverlay(page);
    });
  }
});
