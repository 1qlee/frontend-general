import { useState, type FormEvent } from 'react';

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

/**
 * A typical "it works on my machine" form: placeholders instead of labels,
 * red text that nobody can find, no autocomplete, and focus stays on the
 * submit button after a failed submit. Fix it.
 */
export function SignupForm({ onSubmit }: { onSubmit: (values: SignupValues) => void }) {
  const [values, setValues] = useState<SignupValues>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<SignupErrors>({});

  const update = (field: Field) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(values);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <h2>Create an account</h2>
      <div>
        <input placeholder="Name" value={values.name} onChange={update('name')} />
        {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
      </div>
      <div>
        <input type="email" placeholder="Email" value={values.email} onChange={update('email')} />
        {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
      </div>
      <div>
        <input type="password" placeholder="Password (8+ chars)" value={values.password} onChange={update('password')} />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>
      <button type="submit">Create account</button>
    </form>
  );
}

export default function SignupDemo() {
  const [done, setDone] = useState<string | null>(null);
  return done ? <p>Welcome, {done}!</p> : <SignupForm onSubmit={(v) => setDone(v.name)} />;
}
