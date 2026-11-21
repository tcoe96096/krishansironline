import assert from 'node:assert/strict';
import test from 'node:test';

// REVIEW-ONLY synthetic policy oracle, NOT an application URL validator.
// No network requests, live embeds, credentials, storage, or signed URLs.
type VideoDecision = { allowed: boolean; normalizedUrl: string | null };
const DENY: VideoDecision = { allowed: false, normalizedUrl: null };
const approvedHosts = new Set(['www.youtube-nocookie.com', 'player.vimeo.com']);
function mockVideoEmbedDecision(input: unknown): VideoDecision {
  if (typeof input !== 'string' || input.length > 2048 || !input || input !== input.trim()) return DENY;
  let url: URL;
  try { url = new URL(input); } catch { return DENY; }
  if (url.protocol !== 'https:' || !approvedHosts.has(url.hostname.toLowerCase()) ||
      url.username || url.password || url.port || url.hash ||
      /[\u0000-\u001f\u007f]/.test(input)) return DENY;
  if (url.hostname === 'www.youtube-nocookie.com') {
    if (!/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname) || url.search) return DENY;
  } else {
    if (!/^\/video\/[0-9]+$/.test(url.pathname) || url.search) return DENY;
  }
  return { allowed: true, normalizedUrl: url.href };
}
test('mock allowlist accepts only canonical HTTPS embed paths', () => {
  assert.equal(mockVideoEmbedDecision('https://www.youtube-nocookie.com/embed/abcdefghijk').allowed, true);
  assert.equal(mockVideoEmbedDecision('https://player.vimeo.com/video/123456').allowed, true);
});
test('mock rejects dangerous schemes, plain HTTP and unapproved hosts', () => {
  for (const input of [
    'javascript:alert(1)', 'data:text/html,hello', 'http://player.vimeo.com/video/123',
    'https://evil.example/embed/abcdefghijk',
    'https://www.youtube-nocookie.com.evil.example/embed/abcdefghijk',
    '//www.youtube-nocookie.com/embed/abcdefghijk',
  ]) assert.deepEqual(mockVideoEmbedDecision(input), DENY, input);
});
test('mock rejects credentials, ports, fragments, query redirects and invalid paths', () => {
  for (const input of [
    'https://user:pass@player.vimeo.com/video/123',
    'https://player.vimeo.com:444/video/123',
    'https://player.vimeo.com/video/123#frag',
    'https://player.vimeo.com/video/123?redirect=https://evil.example',
    'https://www.youtube-nocookie.com/watch?v=abcdefghijk',
    'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1',
    'https://player.vimeo.com/video/not-an-id',
    ' https://player.vimeo.com/video/123',
  ]) assert.deepEqual(mockVideoEmbedDecision(input), DENY, input);
});
test('denied mock embeds never expose a renderable URL', () => {
  for (const input of [null, {}, '', 'https://evil.example/video', 'javascript:alert(1)']) {
    assert.equal(mockVideoEmbedDecision(input).normalizedUrl, null);
  }
});

// No claims about redirects, iframe sandbox/CSP, token expiry, or server-side entitlement.
// Those require separate integration and authenticated browser evidence.
