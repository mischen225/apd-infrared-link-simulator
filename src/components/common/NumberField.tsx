interface NumberFieldProps {
  label: string;
  value: number;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  unit,
  step = 'any' as unknown as number,
  min,
  max,
  hint,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="field-row" title={hint}>
      <span className="field-label">{label}</span>
      <span className="field-control">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
        <span className="field-unit">{unit}</span>
      </span>
    </label>
  );
}
