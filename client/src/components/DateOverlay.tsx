import dayjs from 'dayjs';
import { cloneElement, isValidElement, type CSSProperties, type ReactElement } from 'react';

interface DateOverlayProps {
    /** Current value of the wrapped native <input type="date">, as ISO yyyy-mm-dd (or '' / undefined). */
    value?: string | null;
    /** Classes for the positioning wrapper — only needed when the input participates in a flex
     *  layout via flex-1/min-w-0 (those classes must move here since the wrapper, not the input,
     *  becomes the flex item once the input is nested inside it). */
    wrapperClassName?: string;
    /** Classes for the overlay label — match the input's own font-size/padding so the dd/mm/yyyy
     *  text lines up with where the (now invisible) native text would sit. */
    textClassName?: string;
    /** The native <input type="date" .../> being wrapped. */
    children: ReactElement;
}

const ISO_FORMAT = 'YYYY-MM-DD';
const DISPLAY_FORMAT = 'DD/MM/YYYY';

/**
 * Chrome/Firefox render native <input type="date"> in the browser's own locale
 * (mm/dd/yyyy) regardless of a `lang` attribute on the element — there is no
 * supported way to make the native control itself display dd/mm/yyyy. This wraps
 * the native input (keeping its value binding, validation, min/max, calendar
 * picker, and — for react-hook-form fields — register()/watch() untouched) and
 * overlays a dd/mm/yyyy label on top of it, making the native text transparent.
 */
export default function DateOverlay({ value, wrapperClassName, textClassName, children }: DateOverlayProps) {
    const display = value && dayjs(value, ISO_FORMAT, true).isValid()
        ? dayjs(value, ISO_FORMAT).format(DISPLAY_FORMAT)
        : '';

    if (!isValidElement(children)) return children;

    const childProps = children.props as { className?: string; style?: CSSProperties };
    const child = cloneElement(children, {
        style: { ...childProps.style, color: 'transparent' },
        className: `${childProps.className || ''} date-overlay-input`.trim(),
    } as any);

    return (
        <div className={`relative inline-block ${wrapperClassName || ''}`}>
            {child}
            <span className={`absolute inset-y-0 left-0 flex items-center pointer-events-none select-none whitespace-nowrap ${textClassName || 'pl-4 text-sm text-slate-900'}`}>
                {display || <span className="text-slate-400">dd/mm/yyyy</span>}
            </span>
        </div>
    );
}
