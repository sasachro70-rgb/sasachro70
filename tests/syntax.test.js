// Every script of the site parses (a syntax error in one page script would leave that page blank). No packages. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []); }
test('all page scripts in js/ and content/ parse', () => {
  const files = walk(path.join(ROOT, 'js')).concat(walk(path.join(ROOT, 'content')));
  assert.ok(files.length > 30);
  for (const f of files) assert.doesNotThrow(() => new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }), path.relative(ROOT, f));
});
test('every script a page loads exists', () => {
  for (const page of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const m of html.matchAll(/<script src="([^"]+)"/g)) if (!/^https?:/.test(m[1])) assert.ok(fs.existsSync(path.join(ROOT, m[1])), page + ' → ' + m[1]);
  }
});
