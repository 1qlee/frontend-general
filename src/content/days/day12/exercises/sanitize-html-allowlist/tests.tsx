import { describe, it, expect } from 'vitest';
import { sanitizeHtml, type SanitizeOptions } from './solution';

const opts: SanitizeOptions = {
  allowedTags: ['p', 'b', 'i', 'em', 'strong', 'a', 'img', 'ul', 'li', 'br'],
  allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt'] },
};

describe('sanitizeHtml', () => {
  it('keeps allowed markup unchanged', () => {
    const html = '<p>Hello <b>world</b></p><ul><li>one</li><li>two</li></ul>';
    expect(sanitizeHtml(html, opts)).toBe(html);
  });

  it('drops script/style/iframe/svg together with their content — even if allow-listed', () => {
    const html = '<p>hi</p><script>alert(1)</script><style>p{color:red}</style><iframe src="https://evil.example"></iframe><svg onload="alert(1)"><circle r="5"></circle></svg>';
    expect(sanitizeHtml(html, opts)).toBe('<p>hi</p>');
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script>', { ...opts, allowedTags: [...opts.allowedTags, 'script'] })).toBe('<p>a</p>');
  });

  it('unwraps disallowed elements but keeps their (sanitized) children', () => {
    expect(sanitizeHtml('<div class="card"><span>keep <b>me</b></span> <u>too</u></div>', opts)).toBe('keep <b>me</b> too');
  });

  it('removes on* event-handler attributes — even if the config allows them', () => {
    const risky: SanitizeOptions = { ...opts, allowedAttributes: { img: ['src', 'alt', 'onerror'] } };
    expect(sanitizeHtml('<img src="cat.png" onerror="alert(1)" alt="A cat">', risky)).toBe('<img src="cat.png" alt="A cat">');
  });

  it('removes attributes that are not allow-listed for that tag, and honours "*"', () => {
    const withGlobal: SanitizeOptions = { ...opts, allowedAttributes: { ...opts.allowedAttributes, '*': ['title'] } };
    expect(sanitizeHtml('<p title="greeting" class="lead" style="color:red" id="x">Hi</p>', withGlobal)).toBe('<p title="greeting">Hi</p>');
    expect(sanitizeHtml('<a href="/docs" class="btn" title="Docs">Docs</a>', opts)).toBe('<a href="/docs" title="Docs">Docs</a>');
  });

  it('removes dangerous URLs and keeps safe ones', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>', opts)).toBe('<a>x</a>');
    expect(sanitizeHtml('<a href="  JaVaScRiPt:alert(1)">x</a>', opts)).toBe('<a>x</a>');
    expect(sanitizeHtml('<img src="data:image/svg+xml,payload" alt="x">', opts)).toBe('<img alt="x">');
    expect(sanitizeHtml('<a href="https://example.com/?a=1&amp;b=2">ok</a><a href="/rel">rel</a>', opts)).toBe(
      '<a href="https://example.com/?a=1&amp;b=2">ok</a><a href="/rel">rel</a>',
    );
  });

  it('checks URLs AFTER the parser has decoded entities', () => {
    // &#x09; is a tab and &#106; is "j" — both are decoded by the HTML parser before the browser uses the URL.
    expect(sanitizeHtml('<a href="jav&#x09;ascript:alert(1)">x</a><a href="&#106;avascript:alert(1)">y</a>', opts)).toBe('<a>x</a><a>y</a>');
  });

  it('removes HTML comments', () => {
    expect(sanitizeHtml('<p>a<!-- internal note --></p><!--[if IE]><b>x</b><![endif]-->', opts)).toBe('<p>a</p>');
  });

  it('normalises tag case and malformed markup via the real HTML parser', () => {
    expect(sanitizeHtml('<P>Hi <B>there</B></P>', opts)).toBe('<p>Hi <b>there</b></p>');
    expect(sanitizeHtml('<ul><li>one<li>two</ul>', opts)).toBe('<ul><li>one</li><li>two</li></ul>');
  });

  it('returns a string with text safely escaped', () => {
    expect(sanitizeHtml('1 < 2 & 3 > 2', opts)).toBe('1 &lt; 2 &amp; 3 &gt; 2');
    expect(sanitizeHtml('', opts)).toBe('');
  });
});
