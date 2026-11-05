import { Component, type ReactNode } from "react";

// Флаг «автоперезагрузка по чанковой ошибке уже была» — защита от бесконечного reload-цикла.
const CHUNK_RELOAD_FLAG = "mishkin:chunk-reload";
// Флаг сбрасывается через 5с после успешного монтирования: следующий визит (через день)
// снова сможет авторелоадиться на свежий деплой.
const FLAG_RESET_DELAY_MS = 5000;

// Маркеры отказа динамического импорта; формулировки различаются между браузерами
// (Chrome / Firefox / Safari), поэтому сверяем регистронезависимо по подстроке.
const CHUNK_ERROR_MARKERS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "chunkloaderror",
  "importing a module script failed",
] as const;

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return CHUNK_ERROR_MARKERS.some((marker) => lowered.includes(marker));
}

function hasReloadFlag(): boolean {
  try {
    return sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
  } catch {
    // sessionStorage недоступен (приватный режим iOS и т.п.) — авторелоад безопаснее отключить
    return true;
  }
}

function setReloadFlag(): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
  } catch {
    // без sessionStorage автоперезагрузка и так заблокирована hasReloadFlag
  }
}

function clearReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    // нечего чистить — флага нет
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Ловит ошибки рендера, включая падение React.lazy-чанков (recharts и т.п.).
 * Чанковая ошибка после нового деплоя лечится одним авторелоадом на свежий index.html;
 * повторная ошибка или не-чанковая — показываем fallback-карточку вместо белого экрана.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    if (isChunkLoadError(error) && !hasReloadFlag()) {
      setReloadFlag();
      window.location.reload();
    }
    // иначе остаёмся смонтированными с fallback-карточкой
  }

  componentDidMount(): void {
    this.scheduleFlagReset();
  }

  componentWillUnmount(): void {
    if (this.resetTimer !== null) clearTimeout(this.resetTimer);
  }

  // Таймер планируем только при здоровом рендере: если boundary уже поймал ошибку
  // на первом монтировании, сбрасывать флаг здесь нельзя — сломаем защиту от цикла.
  private scheduleFlagReset(): void {
    if (this.state.hasError || this.resetTimer !== null) return;
    this.resetTimer = setTimeout(() => {
      this.resetTimer = null;
      clearReloadFlag();
    }, FLAG_RESET_DELAY_MS);
  }

  private handleManualReload = (): void => {
    clearReloadFlag();
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-background p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-lg font-semibold text-foreground">
              Что-то сломалось при загрузке экрана
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Данные на устройстве не пострадали. Попробуйте перезагрузить приложение.
            </p>
            <button
              type="button"
              onClick={this.handleManualReload}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground active:opacity-80"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
