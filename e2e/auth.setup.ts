import { test as setup } from "@playwright/test";
import {
  ensureTestChild,
  loginViaUi,
  STORAGE_STATE,
  TEST_EMAIL,
  TEST_PASSWORD,
} from "./helpers";

/**
 * Setup-проект: логин тестового аккаунта через UI и сохранение storageState.
 * Здесь же гарантируем существование «Е2Е Тест» — все записи идут только на него.
 */
setup("подготовка сессии тестового аккаунта", async ({ page }) => {
  await loginViaUi(page, TEST_EMAIL, TEST_PASSWORD);
  await ensureTestChild(page);
  await page.context().storageState({ path: STORAGE_STATE });
});
