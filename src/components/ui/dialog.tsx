import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ComponentPropsWithoutRef } from "react";

/* Кейфреймы Liquid-слоя: spring-выезд шита, pop центрального диалога, fade скрима.
   ВАЖНО: объявляются один раз в <head> документа, ВНЕ Portal.
   Radix оборачивает КАЖДОГО ребёнка DialogPortal в собственный Presence
   (React.Children.map в react-dialog). <style> внутри Portal при закрытии
   размонтируется первым (у него нет анимации → Presence unmount сразу),
   @keyframes исчезают из документа в тот же кадр, когда Content получает
   data-state="closed" → exit-анимация не стартует → animationend/animationcancel
   не наступают → Presence навсегда висит в unmountSuspended, панель остаётся
   в DOM с data-state="closed" и невидимыми кнопками перехватывает клики
   (баг интеграционного смоука). Кейфреймы в <head> живут независимо от диалогов. */
const KEYFRAMES_ID = "mishkin-liquid-sheet-keyframes";
const SHEET_KEYFRAMES = `
@keyframes sheet-in{from{transform:translateY(calc(100% + 20px))}to{transform:none}}
@keyframes sheet-out{from{transform:none}to{transform:translateY(calc(100% + 20px))}}
/* Центральный диалог центрируется standalone-свойством translate (-50% -50% от
   Tailwind-классов). В keyframes НИКАКИХ -50%: transform в анимации композируется
   со свойством translate, и сдвиги сложились бы в -100% — диалог уезжал бы за экран. */
@keyframes dialog-in{from{opacity:0;transform:translateY(2%) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes dialog-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(2.5%) scale(.97)}}
@keyframes scrim-in{from{opacity:0}to{opacity:1}}
@keyframes scrim-out{from{opacity:1}to{opacity:0}}
`;

function ensureSheetKeyframes(): void {
  if (typeof document === "undefined") return; // клиент-only SPA, но страхуемся
  if (document.getElementById(KEYFRAMES_ID) !== null) return; // идемпотентно при HMR
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = SHEET_KEYFRAMES;
  document.head.appendChild(style);
}
ensureSheetKeyframes();

/* Закрытая панель/scrim не должны перехватывать указатель, даже пока Presence
   держит их в DOM (пара кадров exit-анимации или любой будущий сбой размонтирования).
   Только в closed: открытый диалог обязан принимать клики. */
const CLOSED_POINTER = "data-[state=closed]:pointer-events-none";

/** Scrim: цвет и блюр из токенов (--scrim), плавный fade. */
function Scrim(): React.JSX.Element {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-scrim backdrop-blur-[3px] outline-none",
        CLOSED_POINTER,
        "data-[state=open]:[animation:scrim-in_300ms_ease-out_both]",
        "data-[state=closed]:[animation:scrim-out_300ms_ease-in_both]",
        "motion-reduce:animate-none",
      )}
    />
  );
}

/** Круглая стеклянная кнопка-крестик (как .icobtn в превью). */
function CloseButton(): React.JSX.Element {
  return (
    <DialogPrimitive.Close
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full glass-strong border border-stroke text-muted-foreground",
        "transition-transform duration-150 active:scale-90 hover:text-foreground",
      )}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Закрыть</span>
    </DialogPrimitive.Close>
  );
}

/** Bottom sheet: мобильный паттерн из плана (§7.1, Q54).
    Liquid Glass: панель «плавает» с отступом 10px от краёв, radius 32,
    spring-появление снизу; шапка с хваталкой закреплена, контент скроллится внутри. */
export function SheetContent({
  className,
  children,
  title,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <Scrim />
      <DialogPrimitive.Content
        className={cn(
          "fixed bottom-[10px] left-[10px] right-[10px] z-50 mx-auto flex max-h-[calc(100dvh-1.25rem)] w-auto max-w-md flex-col glass rounded-[32px]",
          // safe-area снизу: на iOS шит не прилипает к «ушке» домашнего экрана
          "p-[18px] pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none",
          CLOSED_POINTER,
          "data-[state=open]:[animation:sheet-in_450ms_cubic-bezier(.32,1.35,.45,1)_both]",
          "data-[state=closed]:[animation:sheet-out_300ms_ease-in_both]",
          "motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        {/* Хваталка 40×4 */}
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-stroke2" />
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <DialogPrimitive.Title className="text-[17px] font-extrabold leading-tight">
            {title}
          </DialogPrimitive.Title>
          <CloseButton />
        </div>
        {/* Фикс v0.2: шит не выше вьюпорта — длинный контент скроллится внутри,
            а не уходит за верх экрана; шапка при этом остаётся на месте */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Центральный диалог (подтверждения, формы редактирования) — та же стеклянная стилистика. */
export function DialogContent({
  className,
  children,
  title,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <Scrim />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100dvw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 glass rounded-[28px] p-4 outline-none",
          // Диалог не выше вьюпорта (низкие экраны ~568px): контент скроллится внутри,
          // нижние кнопки («Сохранить»/«Удалить событие») всегда достижимы (фикс v0.2)
          "max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain",
          CLOSED_POINTER,
          "data-[state=open]:[animation:dialog-in_320ms_cubic-bezier(.32,1.35,.45,1)_both]",
          "data-[state=closed]:[animation:dialog-out_240ms_ease-in_both]",
          "motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <DialogPrimitive.Title className="text-[17px] font-extrabold leading-tight">
            {title}
          </DialogPrimitive.Title>
          <CloseButton />
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
