import { useMemo } from 'react';
import { playbook } from '../content';
import { Markdown, extractHeadings } from '../components/Markdown';
import { Icon } from '../components/Icon';
import { Link } from '../lib/router';
import { NotFound } from './NotFound';

export function Playbook({ docId }: { docId?: string }) {
  const doc = docId ? playbook.find((d) => d.id === docId) : undefined;
  const headings = useMemo(() => (doc ? extractHeadings(doc.body) : []), [doc]);

  if (docId && !doc) return <NotFound />;
  if (!doc) {
    return (
      <div className="page narrow">
        <header className="page-header">
          <p className="eyebrow">Reference</p>
          <h1>Interview playbook</h1>
          <p className="lede">Frameworks, scripts and checklists for every round. Skim these the morning of an interview.</p>
        </header>
        {playbook.length === 0 && <p className="empty-state">Playbook docs are coming soon.</p>}
        <ul className="playbook-list">
          {playbook.map((d) => (
            <li key={d.id}>
              <Link to={`/playbook/${d.id}`} className="card playbook-item">
                <Icon name="book" size={20} />
                <span>
                  <strong>{d.title}</strong>
                  <small>{d.summary}</small>
                </span>
                <Icon name="chevronRight" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const index = playbook.indexOf(doc);
  const next = playbook[index + 1];
  return (
    <div className="page wide">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/playbook">Playbook</Link> <Icon name="chevronRight" size={14} /> <span>{doc.title}</span>
      </nav>
      <header className="page-header">
        <h1>{doc.title}</h1>
        <p className="lede">{doc.summary}</p>
      </header>
      <div className="lesson-layout">
        {headings.length > 2 && (
          <aside className="toc" aria-label="On this page">
            <p className="toc-title">On this page</p>
            <ul>
              {headings.map((h) => (
                <li key={h.id} className={`toc-depth-${h.depth}`}>
                  <button type="button" onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })}>
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        <article className="lesson-body">
          <Markdown source={doc.body} />
          {next && (
            <nav className="pager" aria-label="Playbook navigation">
              <span />
              <Link to={`/playbook/${next.id}`} className="pager-link pager-next">
                <span>
                  <small>Next</small>
                  {next.title}
                </span>
                <Icon name="chevronRight" size={16} />
              </Link>
            </nav>
          )}
        </article>
      </div>
    </div>
  );
}
