import { useEffect } from "react";
import { useAuth } from "../stores/auth";
import { useFamily } from "../stores/family";
import { useChildren } from "../stores/children";
import { useSettings } from "../stores/settings";
import { initSyncListeners, syncNow } from "../sync/engine";
import { refreshPendingCount } from "../sync/engine";

/**
 * Оркестратор входа: auth → (синк, семья, дети, настройки) → готово.
 * Циклы импортов разорваны: сторы не знают друг о друге, знает только bootstrap.
 */
export function Bootstrap(): null {
  const phase = useAuth((s) => s.phase);

  useEffect(() => {
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
        console.warn("Стартовый синк не удался:", e);
      }
      try {
        await useFamily.getState().refresh();
      } catch (e) {
        // Не вешаем приложение: экран семьи предложит создать/вступить заново.
        console.warn("Не удалось загрузить семью:", e);
        useFamily.setState({ family: null, members: [], loaded: true });
      }
      try {
        await useChildren.getState().refresh();
      } catch (e) {
        console.warn("Не удалось загрузить детей:", e);
        useChildren.setState({ children: [], activeId: null, loaded: true });
      }
      const userId = useAuth.getState().userId;
      if (userId !== null) {
        try {
          await useSettings.getState().hydrateFromServer(userId);
        } catch (e) {
          console.warn("Настройки с сервера не применились:", e);
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
