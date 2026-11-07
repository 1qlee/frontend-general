import { Link } from '../lib/router';

export function NotFound() {
  return (
    <div className="page narrow">
      <header className="page-header">
        <h1>Not found</h1>
        <p className="lede">That page doesn't exist (or that day hasn't been written yet).</p>
      </header>
      <Link to="/" className="btn btn-primary">
        Back to the dashboard
      </Link>
    </div>
  );
}
