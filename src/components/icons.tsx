/**
 * Фирменные иконки «Мишкин сон» (дизайн «Liquid Glass»).
 * Начертания — 1:1 из эталонного превью v1-liquid-glass.
 * Цвет наследуется через currentColor, размер задаётся классом (h-5 w-5 и т.п.).
 */
import type React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

/** «Zz» — активность сна (штриховая, трёхслойная) */
export function ZzIcon(props: IconProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 12.5h6.5L6 19h6.5" strokeWidth={2.2} />
      <path d="M11 4.5h5l-5 5.5h5" strokeWidth={1.9} />
      <path d="M15.5 14.5h3.2l-3.2 3.4h3.2" strokeWidth={1.7} />
    </svg>
  );
}

/** Бутылочка — кормление из бутылки (заливка, лёгкий наклон) */
export function BottleIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      {/* Наклон бутылки задан в превью; риски уровня — белые полупрозрачные */}
      <g transform="rotate(-14 12 12)">
        <path d="M11.1 1.7c0-.9.7-1.6 1.6-1.6h.6c.9 0 1.6.7 1.6 1.6 0 .8-.4 1.4-1 1.8v.9h-1.8v-.9c-.6-.4-1-.9-1-1.8z" />
        <path d="M10 4.8h5c.4 0 .8.4.8.8v.7c0 .4-.4.8-.8.8h-5c-.4 0-.8-.4-.8-.8v-.7c0-.4.4-.8.8-.8z" />
        <path d="M8.9 7.9h7.2c.7 0 1.2.6 1.2 1.2v10.6c0 1.7-1.4 3.1-3.1 3.1h-3.4c-1.7 0-3.1-1.4-3.1-3.1V9.1c0-.6.5-1.2 1.2-1.2z" />
        <path d="M10 10.6h4.6v.9H10zM10 13.3h4.6v.9H10z" fill="#fff" opacity=".5" />
      </g>
    </svg>
  );
}

/** Подгузник — «трусики» (заливка) */
export function BriefsIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.8 5.5h14.4a1.6 1.6 0 0 1 1.6 1.6c0 4.9-2 8.4-4.8 10.5-.6.9-1.4 2-1.6 3.9a2.4 2.4 0 0 1-4.8 0c-.2-1.9-1-3-1.6-3.9-2.8-2.5-4.8-6-4.8-10.5a1.6 1.6 0 0 1 1.6-1.6z" />
      <path d="M5.3 8.2h13.4v1H5.3z" fill="#fff" opacity=".4" />
    </svg>
  );
}

/** Прикорм — столовые приборы (штриховая) */
export function UtensilsIcon(props: IconProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
      <path d="M21 15v7" />
    </svg>
  );
}
