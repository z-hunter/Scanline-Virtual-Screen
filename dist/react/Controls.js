import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Switch({ label, checked, onChange, className, 'data-testid': testId }) {
    return _jsxs("label", { className: `svs-switch switch-control${className ? ` ${className}` : ''}`, children: [_jsx("span", { className: "svs-switch-label switch-label", children: label }), _jsxs("span", { className: "svs-switch-toggle switch-toggle", children: [_jsx("input", { type: "checkbox", role: "switch", "aria-checked": checked, checked: checked, "data-testid": testId, onChange: (event) => onChange(event.target.checked) }), _jsx("span", { className: "svs-switch-track switch-track", children: _jsx("span", { className: "svs-switch-thumb switch-thumb" }) })] })] });
}
export function SegmentedControl({ value, options, onChange, disabled, 'data-testid': testId }) {
    return _jsx("div", { className: `svs-segmented-control segmented-control${disabled ? ' disabled' : ''}`, "data-testid": testId, role: "radiogroup", children: options.map((option) => _jsx("button", { type: "button", role: "radio", "aria-checked": option.value === value, disabled: disabled, className: `svs-segmented-control-item segmented-control-item ${option.value === value ? 'active' : ''}`, onClick: () => onChange(option.value), children: option.label }, option.value)) });
}
//# sourceMappingURL=Controls.js.map