export declare function Switch({ label, checked, onChange, className, 'data-testid': testId }: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    'data-testid'?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function SegmentedControl<T extends string>({ value, options, onChange, disabled, 'data-testid': testId }: {
    value: T;
    options: readonly {
        value: T;
        label: string;
    }[];
    onChange: (value: T) => void;
    disabled?: boolean;
    'data-testid'?: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Controls.d.ts.map