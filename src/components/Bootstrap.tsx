import { useEffect } from "react";
import { useAuth } from "../stores/auth";
import { useFamily } from "../stores/family";
import { useChildren } from "../stores/children";
import { useSettings } from "../stores/settings";
import { initLogger, installGlobalErrorHandlers, logWarn } from "../lib/logger";
import { initSyncListeners, syncNow } from "../sync/engine";
import { refreshPendingCount } from "../sync/engine";

/**
 * Оркестратор входа: auth → (синк, семья, дети, настройки) → готово.
 * Циклы импортов разорваны: сторы не знают друг о друге, знает только bootstrap.
 */
export function Bootstrap(): null {
  const phase = useAuth((s) => s.phase);

  useEffect(() => {
    // Журнал должен встать раньше всего: глобальные перехватчики ловят ошибки старта.
    void initLogger();
    installGlobalErrorHandlers();
    void useAuth.getState().init();
    useSettings.getState().hydrateLocal();
    void refreshPendingCount();
    return initSyncListeners();
  }, []);

  useEffect(() => {
    if (phase !== "signedIn") return;
    void (async () => {
      try {
        await syncNow();
      } catch (e) {
        logWarn("bootstrap.sync", "Стартовый синк не удался", { error: e });
      }
      try {
        await useFamily.getState().refresh();
      } catch (e) {
        // Не вешаем приложение: экран семьи предложит создать/вступить заново.
        logWarn("bootstrap.family", "Не удалось загрузить семью", { error: e });
        useFamily.setState({ family: null, members: [], loaded: true });
      }
      try {
        await useChildren.getState().refresh();
      } catch (e) {
        logWarn("bootstrap.children", "Не удалось загрузить детей", { error: e });
        useChildren.setState({ children: [], activeId: null, loaded: true });
      }
      const userId = useAuth.getState().userId;
      if (userId !== null) {
        try {
          await useSettings.getState().hydrateFromServer(userId);
        } catch (e) {
          logWarn("bootstrap.settings", "Настройки с сервера не применились", { error: e });
        }
      }
    })();
  }, [phase]);

  useEffect(() => {
    if (phase !== "signedOut") return;
    useFamily.setState({ family: null, members: [], loaded: false });
    useChildren.setState({ children: [], activeId: null, loaded: false });
  }, [phase]);

  return null;
}
