#!/usr/bin/env node
// Смоук-проверка деплоя «Мишкин сон»: главная страница, все её ассеты, манифест и service worker.
// Запуск: node scripts/deploy-smoke.mjs [base-url]  (по умолчанию https://mishkin-son.vercel.app)
// Код выхода: 0 — все проверки прошли, 1 — есть хотя бы одна неудача.

const DEFAULT_BASE_URL = "https://mishkin-son.vercel.app";
const REQUEST_TIMEOUT_MS = 15_000;
const EXPECTED_TITLE = "<title>Мишкин сон</title>";

let failed = 0;

function logOk(message) {
  console.log(`  [OK]   ${message}`);
}

function logFail(message) {
  console.log(`  [FAIL] ${message}`);
  failed += 1;
}

/** fetch с таймаутом; возвращает ответ или бросает понятную ошибку сети. */
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { redirect: "follow", signal: controller.signal });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError"
      ? `таймаут ${REQUEST_TIMEOUT_MS} мс`
      : String(error instanceof Error ? error.message : error);
    throw new Error(`сетевая ошибка: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Проверка «URL отвечает 200». Возвращает true при успехе. */
async function checkUrl(label, url) {
  try {
    const response = await fetchWithTimeout(url);
    if (response.ok) {
      logOk(`${label} → ${response.status} ${url}`);
      return true;
    }
    logFail(`${label} → HTTP ${response.status} ${url}`);
    return false;
  } catch (error) {
    logFail(`${label} → ${url}: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

/** Извлекает все src у <script> и href у <link> из HTML. */
function extractAssetUrls(html) {
  const raw = [];
  const tagPattern = /<(script|link)\b[^>]*>/gi;
  const attrPatterns = {
    script: /\bsrc\s*=\s*["']([^"']+)["']/i,
    link: /\bhref\s*=\s*["']([^"']+)["']/i,
  };

  for (const match of html.matchAll(tagPattern)) {
    const tagName = match[1];
    const attrMatch = match[0].match(attrPatterns[tagName]);
    if (attrMatch !== null) raw.push(attrMatch[1]);
  }
  return raw;
}

async function main() {
  const baseUrl = (process.argv[2] ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  console.log(`Смоук деплоя: ${baseUrl}`);

  // 1. Главная страница: 200 + заголовок
  let html = null;
  try {
    const response = await fetchWithTimeout(`${baseUrl}/`);
    if (response.ok) {
      html = await response.text();
      if (html.includes(EXPECTED_TITLE)) {
        logOk(`GET / → ${response.status}, заголовок «Мишкин сон» найден`);
      } else {
        logFail(`GET / → ${response.status}, но <title>Мишкин сон</title> не найден в HTML`);
      }
    } else {
      logFail(`GET / → HTTP ${response.status}`);
    }
  } catch (error) {
    logFail(`GET / → ${error instanceof Error ? error.message : error}`);
  }

  // 2. Все ассеты главной (script/link) должны отвечать 200
  if (html !== null) {
    const urls = new Set();
    for (const raw of extractAssetUrls(html)) {
      if (/^(data:|blob:)/i.test(raw) || raw.startsWith("#")) continue;
      urls.add(new URL(raw, `${baseUrl}/`).toString());
    }
    if (urls.size === 0) {
      logFail("в HTML не найдено ни одного ассета script/link");
    }
    console.log(`Проверка ассетов главной: ${urls.size} шт.`);
    // последовательно: читаемый вывод, объём маленький
    for (const url of urls) {
      await checkUrl("asset", url);
    }
  } else {
    logFail("ассеты не проверены: главная страница не получена");
  }

  // 3. Манифест PWA и 4. Service worker
  await checkUrl("manifest", `${baseUrl}/manifest.webmanifest`);
  await checkUrl("sw", `${baseUrl}/sw.js`);

  if (failed > 0) {
    console.log(`\nИтог: ${failed} проверок провалено.`);
    process.exit(1);
  }
  console.log("\nИтог: все проверки пройдены.");
}

main();
