import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {approvedAccounts, inspectCsp, inspectText, privateFile} from './security-rules.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
// All account fixtures below are synthetic and do not contain the approved real account data.
const sampleGroups = () => [0, 1].map(group => ({
  label: `Sample group ${group}`,
  accounts: [0, 1, 2].map(index => ({role: `Role ${index}`, name: `Sample person ${index}`, bank: 'Sample bank', number: `999-100000-00-00${group * 3 + index + 1}`})),
}));

test('the production policy permits only the reviewed parent-page script origin', () => {
  assert.deepEqual(inspectCsp(html), []);
  const expanded = html.replace("script-src 'self'", "script-src 'self' https://www.youtube.com");
  assert.ok(inspectCsp(expanded).some(finding => finding.includes('script-src')));
});

test('missing, duplicated and weakened CSP directives fail closed', () => {
  assert.ok(inspectCsp('<html></html>').length);
  assert.ok(inspectCsp(html.replace("object-src 'none'", "object-src 'none'; object-src *")).length);
  assert.ok(inspectCsp(html.replace("base-uri 'self'", 'base-uri *')).length);
  assert.ok(inspectCsp(html + html).length);
});

test('a local account is detected even when its separators change', () => {
  // Synthetic test value; no real financial data is used in test fixtures.
  const fake = '999-888777-66-555';
  for (const value of [fake, fake.replaceAll('-', ''), fake.replaceAll('-', ' ')]) {
    assert.ok(inspectText('bundle.js', `number: "${value}"`, [fake]).includes('local financial account information'));
  }
});

test('credential findings never contain the matching private value', () => {
  const fake = 'ghp_' + 'X'.repeat(36);
  const findings = inspectText('bundle.js', `token="${fake}"`);
  assert.deepEqual(findings, ['GitHub credential']);
  assert.ok(!JSON.stringify(findings).includes(fake));
});

test('private files and financial patterns are rejected without a local account file', () => {
  for (const name of ['.env', 'accounts.local.json', 'credentials.json', 'secrets.txt', 'bundle.js.map', 'server.ts', 'key.pem']) assert.equal(privateFile(name), true, name);
  for (const name of ['index.html', 'index-abc.js', 'license.txt', 'photo.webp']) assert.equal(privateFile(name), false, name);
  assert.ok(inspectText('bundle.js', '9999-88-7776665').includes('financial account information'));
});

test('the public approval list requires two groups of three complete records', () => {
  assert.deepEqual(approvedAccounts(sampleGroups()).findings, []);
  for (const mutate of [
    groups => groups.pop(),
    groups => groups[0].accounts.pop(),
    groups => { delete groups[0].accounts[0].role; },
    groups => { groups[0].accounts[0].name = ''; },
    groups => { groups[0].accounts[0].bank = ''; },
    groups => { groups[0].accounts[0].number = 'invalid'; },
    groups => { groups[0].accounts[0].extra = 'unapproved field'; },
    groups => { groups[0].accounts[0].number = groups[1].accounts[0].number; },
  ]) {
    const groups = sampleGroups();
    mutate(groups);
    const result = approvedAccounts(groups);
    assert.ok(result.findings.length);
    assert.deepEqual(result.numbers, []);
  }
});

test('only the six approved numbers are allowed, including their local-file copies', () => {
  const {numbers} = approvedAccounts(sampleGroups());
  const text = JSON.stringify(sampleGroups());
  assert.deepEqual(inspectText('bundle.js', text, numbers, numbers), []);
  for (const number of numbers) {
    assert.deepEqual(inspectText('bundle.js', `number:"${number.replaceAll('-', '')}"`, numbers, numbers), []);
    assert.deepEqual(inspectText('bundle.js', `number:"${number.replaceAll('-', ' ')}"`, numbers, numbers), []);
  }
  assert.equal(privateFile('accounts.local.json'), true);
  assert.equal(privateFile('accounts.public.json'), false);
});

test('a seventh account or an unapproved local account is still rejected', () => {
  const {numbers} = approvedAccounts(sampleGroups());
  const extra = '999-100000-00-007';
  assert.ok(inspectText('bundle.js', `number:"${extra}"`, [...numbers, extra], numbers).includes('financial account information'));
  for (const value of [extra, extra.replaceAll('-', ''), extra.replaceAll('-', ' ')]) {
    assert.ok(inspectText('bundle.js', `number:"${value}"`, [...numbers, extra], numbers).includes('local financial account information'));
  }
  assert.ok(inspectText('bundle.js', 'number:"888877776666"', [], numbers).includes('financial account information'));
});

test('public account approval never exempts credentials or leaks values through findings', () => {
  const {numbers} = approvedAccounts(sampleGroups());
  const fakeToken = 'ghp_' + 'X'.repeat(36);
  const findings = inspectText('bundle.js', JSON.stringify({numbers, token: fakeToken}), numbers, numbers);
  assert.deepEqual(findings, ['GitHub credential']);
  assert.ok(!JSON.stringify(findings).includes(fakeToken));
  assert.ok(numbers.every(number => !JSON.stringify(findings).includes(number)));
});

test('SVG assets cannot contain scripts, event handlers or HTML documents', () => {
  assert.deepEqual(inspectText('icon.svg', '<svg><path d="M0 0"/></svg>'), []);
  for (const content of ['<svg><script/></svg>', '<svg onload="x()"/>', '<svg><foreignObject/></svg>', '<svg><a href="javascript:x()"/></svg>']) {
    assert.ok(inspectText('icon.svg', content).includes('active content in SVG asset'));
  }
});

test('font data URLs that violate the deployment policy are caught', () => {
  assert.ok(inspectText('site.css', '@font-face{src:url("data:font/woff2;base64,test")}').length);
  assert.deepEqual(inspectText('site.css', '@font-face{src:url("font.woff2")}'), []);
});
