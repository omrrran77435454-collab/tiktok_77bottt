import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

/* مكوّنات واجهة صغيرة ومشتركة — كلها Semantic HTML مع Labels صحيحة. */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="hint" style={{ color: 'var(--danger-700)' }} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  hint?: string;
  onValueChange: (value: string) => void;
}

export function TextInput({ label, hint, onValueChange, ...rest }: TextInputProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        className="input"
        {...rest}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </Field>
  );
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  hint?: string;
  onValueChange: (value: string) => void;
}

export function TextArea({ label, hint, onValueChange, ...rest }: TextAreaProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        className="textarea"
        {...rest}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </Field>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
}

export function SelectField({ label, hint, options, onValueChange, ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        className="select"
        {...rest}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'error' | 'success';
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div>
        {title ? <strong className="alert-title">{title}</strong> : null}
        <span>{children}</span>
      </div>
    </div>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'success' | 'warn' | 'danger';
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Spinner({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <span className="row" style={{ gap: 'var(--sp-2)', color: 'var(--fg-muted)' }}>
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function LoadingScreen({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="center-screen" role="status" aria-live="polite">
      <Spinner label={label} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
      <h3 className="title-sm">{title}</h3>
      {description ? (
        <p className="muted" style={{ marginBlockStart: 'var(--sp-2)' }}>
          {description}
        </p>
      ) : null}
      {action ? <div style={{ marginBlockStart: 'var(--sp-4)' }}>{action}</div> : null}
    </div>
  );
}
