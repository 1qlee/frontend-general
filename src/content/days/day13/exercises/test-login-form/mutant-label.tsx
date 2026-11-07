import { useId, useState, type FormEvent } from 'react';

export interface LoginValues {
  email: string;
  password: string;
}

export interface LoginFormProps {
  /** Called once per valid submission. The submit button stays disabled until it settles. */
  onSubmit: (values: LoginValues) => void | Promise<void>;
}

type FieldErrors = Partial<Record<keyof LoginValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }: LoginValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const id = useId();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch {
      setSubmitError('Sign-in failed. Please try again.');
    } finally {
      setPending(false);
    }
  }

  const emailId = `${id}-email`;
  const passwordId = `${id}-password`;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Sign in">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
        />
        {errors.email && (
          <p id={`${emailId}-error`} role="alert">
            {errors.email}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? `${passwordId}-error` : undefined}
        />
        {errors.password && (
          <p id={`${passwordId}-error`} role="alert">
            {errors.password}
          </p>
        )}
      </div>
      {submitError && <p role="alert">{submitError}</p>}
      <button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default LoginForm;
