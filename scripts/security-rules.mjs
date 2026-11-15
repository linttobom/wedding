const credentialPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub credential', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/],
  ['AWS access credential', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['OpenAI credential', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}\b/],
  ['Google API credential', /\bAIza[A-Za-z0-9_-]{35}\b/],
  ['Slack credential', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
];

const accountDigits = number => typeof number === 'string' ? number.replace(/\D/g, '') : '';

// This file is the explicit public-account approval list, not a blanket financial-data exemption.
export function approvedAccounts(groups) {
  const findings = [];
  if (!Array.isArray(groups) || groups.length !== 2) {
    return {numbers: [], findings: ['approved account data must contain exactly two groups']};
  }
  const numbers = [];
  for (const group of groups) {
    if (!group || typeof group !== 'object' || Object.keys(group).some(key => !['label', 'accounts'].includes(key)) ||
        typeof group.label !== 'string' || !group.label.trim() || !Array.isArray(group.accounts) || group.accounts.length !== 3) {
      findings.push('each approved account group must have a label and exactly three records');
      continue;
    }
    for (const account of group.accounts) {
      if (!account || typeof account !== 'object' || Object.keys(account).some(key => !['role', 'name', 'bank', 'number'].includes(key)) ||
          !['role', 'name', 'bank', 'number'].every(key => typeof account[key] === 'string' && account[key].trim())) {
        findings.push('approved account records must contain only role, name, bank and number strings');
        continue;
      }
      const digits = accountDigits(account.number);
      if (!/^\d+(?:[- ]\d+)*$/.test(account.number.trim()) || digits.length < 10 || digits.length > 16) {
        findings.push('approved account record has an invalid number format');
        continue;
      }
      numbers.push(account.number);
    }
  }
  if (new Set(numbers.map(accountDigits)).size !== 6) findings.push('approved account data must contain exactly six distinct numbers');
  return {numbers: findings.length ? [] : numbers, findings: [...new Set(findings)]};
}

function financialNumbers(text) {
  const formatted = [...text.matchAll(/\b\d{2,8}(?:-\d{2,8}){1,4}\b/g)].map(([number]) => number);
  const fields = [...text.matchAll(/\b(?:account(?:Number)?|number|계좌번호)\s*["']?\s*[:=]\s*["'](\d[\d -]{8,30}\d)["']/gi)].map(([, number]) => number);
  return [...formatted, ...fields].filter(number => {
    const length = accountDigits(number).length;
    return length >= 10 && length <= 16;
  });
}

export function privateFile(name) {
  return /^\.|\.(?:map|pem|key|p12|pfx|sqlite|db|ts|tsx|mjs|lock)$|(?:^|[.-])local(?:[.-]|$)|^(?:credentials|secrets)(?:\.|$)/i.test(name);
}

// Findings contain categories only. Never return the matching credential value.
export function inspectText(name, text, privateNumbers = [], publicNumbers = []) {
  const findings = credentialPatterns.filter(([, pattern]) => pattern.test(text)).map(([kind]) => kind);
  const approved = new Set(publicNumbers.map(accountDigits).filter(Boolean));
  if (financialNumbers(text).some(number => !approved.has(accountDigits(number)))) findings.push('financial account information');
  if (privateNumbers.length) {
    if (privateNumbers.some(number => {
      const digits = accountDigits(number);
      return digits.length >= 10 && !approved.has(digits) && new RegExp(`(?<!\\d)${digits.split('').join('[-\\s]*')}(?!\\d)`).test(text);
    })) {
      findings.push('local financial account information');
    }
  }
  if (/\.css$/i.test(name) && /url\(\s*["']?data:(?:font\/|application\/(?:font|x-font|vnd\.ms-fontobject))/i.test(text)) {
    findings.push('inline font conflicts with font-src policy');
  }
  if (/\.svg$/i.test(name) && /<\s*(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?:javascript:|data:text\/html)/i.test(text)) {
    findings.push('active content in SVG asset');
  }
  return findings;
}

export function inspectCsp(html) {
  const policies = [...html.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag]) => {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(([, key, double, single]) => [key.toLowerCase(), double ?? single]));
    return attributes['http-equiv']?.toLowerCase() === 'content-security-policy' ? [attributes.content ?? ''] : [];
  });
  if (policies.length !== 1) return ['exactly one Content Security Policy is required'];
  const findings = [];
  const directives = new Map();
  for (const directive of policies[0].split(';').map(value => value.trim()).filter(Boolean)) {
    const [name, ...sources] = directive.split(/\s+/);
    if (directives.has(name)) findings.push(`duplicate CSP directive: ${name}`);
    directives.set(name, sources);
  }
  const required = {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://t1.kakaocdn.net'],
    'font-src': ["'self'"],
    'media-src': ["'self'"],
    'worker-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ['https://sharer.kakao.com'],
    'frame-src': ["'self'", 'https://www.youtube-nocookie.com', 'https://*.kakao.com', 'kakaolink:'],
    'upgrade-insecure-requests': [],
  };
  for (const [name, sources] of Object.entries(required)) {
    const actual = directives.get(name);
    if (!actual || actual.length !== sources.length || sources.some(source => !actual.includes(source))) {
      findings.push(`unexpected or missing CSP directive: ${name}`);
    }
  }
  return findings;
}
