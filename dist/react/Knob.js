import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from 'react';
export function formatValue(value) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3))); }
export function Knob({ value, min, max, step, label, onChange, disabled }) {
    const start = useRef(null);
    const ratio = (value - min) / (max - min);
    return _jsx("div", { className: `svs-knob knob ${disabled ? 'disabled' : ''}`, role: "slider", "aria-label": label, "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": value, "aria-disabled": disabled ? 'true' : undefined, tabIndex: disabled ? -1 : 0, style: { '--knob-progress': `${ratio * 340}deg` }, onPointerDown: (event) => { if (disabled)
            return; start.current = { y: event.clientY, value }; event.currentTarget.setPointerCapture(event.pointerId); }, onPointerMove: (event) => { if (disabled || !start.current || !event.buttons)
            return; const next = Math.min(max, Math.max(min, start.current.value + (start.current.y - event.clientY) * step / 8)); onChange(Math.round(next / step) * step); }, onPointerUp: () => { start.current = null; }, onWheel: (event) => { if (disabled)
            return; event.preventDefault(); onChange(Math.min(max, Math.max(min, value + (event.deltaY < 0 ? step : -step)))); }, onKeyDown: (event) => { if (disabled)
            return; if (event.key === 'ArrowUp' || event.key === 'ArrowRight')
            onChange(Math.min(max, value + step)); if (event.key === 'ArrowDown' || event.key === 'ArrowLeft')
            onChange(Math.max(min, value - step)); }, children: _jsx("span", { children: formatValue(value) }) });
}
//# sourceMappingURL=Knob.js.map