import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

export interface SignupValues {
  name: string;
  email: string;
  password: string;
}

type Field = keyof SignupValues;
export type SignupErrors = Partial<Record<Field, string>>;

/** Validation is done for you — today's job is the accessibility around it. */
export function validate(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  if (!values.name.trim()) errors.name = 'Enter your name';
  if (!values.email.trim()) errors.email = 'Enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Enter an email address in the correct format, like name@example.com';
  if (values.password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
}

/** DOM order — the first invalid field in this order receives focus. */
const FIELDS: Field[] = ['name', 'email', 'password'];

export function SignupForm({ onSubmit }: { onSubmit: (values: SignupValues) => void }) {
  const id = useId();
  const [values, setValues] = useState<SignupValues>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [summary, setSummary] = useState('');
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  const fieldId = (field: Field) => `${id}-${field}`;
  const errorId = (field: Field) => `${id}-${field}-error`;
  const hintId = `${id}-password-hint`;

  /** aria-describedby = hint(s) + error (if any). Undefined when empty so React omits it. */
  const describedBy = (field: Field, ...hints: string[]) =>
    [...hints, errors[field] ? errorId(field) : ''].filter(Boolean).join(' ') || undefined;

  const update = (field: Field) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  const register = (field: Field) => (el: HTMLInputElement | null) => {
    inputs.current[field] = el;
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    const invalid = FIELDS.filter((field) => nextErrors[field]);

    if (invalid.length === 0) {
      setSummary('');
      onSubmit(values);
      return;
    }
    // The live region already exists (rendered empty), so changing its text is announced.
    setSummary(invalid.length === 1 ? 'There is 1 error in this form' : `There are ${invalid.length} errors in this form`);
    // The inputs are already mounted, so we can focus synchronously in the handler.
    inputs.current[invalid[0]]?.focus();
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Create an account</h2>

      {/* Always rendered (empty) so assistive tech is already watching it when text appears. */}
      <div role="alert" style={{ color: '#b00020', fontWeight: 600 }}>
        {summary}
      </div>

      <div>
        <label htmlFor={fieldId('name')}>Name</label>
        <input
          id={fieldId('name')}
          ref={register('name')}
          type="text"
          autoComplete="name"
          required
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy('name')}
          value={values.name}
          onChange={update('name')}
        />
        {errors.name && <p id={errorId('name')}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor={fieldId('email')}>Email</label>
        <input
          id={fieldId('email')}
          ref={register('email')}
          type="email"
          autoComplete="email"
          required
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy('email')}
          value={values.email}
          onChange={update('email')}
        />
        {errors.email && <p id={errorId('email')}>{errors.email}</p>}
      </div>

      <div>
        <label htmlFor={fieldId('password')}>Password</label>
        <p id={hintId}>Must be at least 8 characters.</p>
        <input
          id={fieldId('password')}
          ref={register('password')}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy('password', hintId)}
          value={values.password}
          onChange={update('password')}
        />
        {errors.password && <p id={errorId('password')}>{errors.password}</p>}
      </div>

      <button type="submit">Create account</button>
    </form>
  );
}

export default function SignupDemo() {
  const [done, setDone] = useState<string | null>(null);
  return done ? <p>Welcome, {done}!</p> : <SignupForm onSubmit={(v) => setDone(v.name)} />;
}
