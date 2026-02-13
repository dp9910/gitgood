/**
 * Security utilities for GitGood.
 * CSP headers, CSRF protection, XSS detection, and security auditing.
 */

import { randomBytes } from "crypto";

// ---------- Content Security Policy ----------

export interface CSPDirectives {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  objectSrc: string[];
  baseUri: string[];
}

const DEFAULT_CSP: CSPDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // needed for Next.js
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
  connectSrc: [
    "'self'",
    "https://api.github.com",
    "https://generativelanguage.googleapis.com",
    "https://*.firebaseio.com",
    "https://*.googleapis.com",
  ],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
};

export function buildCSP(overrides?: Partial<CSPDirectives>): string {
  const directives = { ...DEFAULT_CSP, ...overrides };

  const parts: string[] = [
    `default-src ${directives.defaultSrc.join(" ")}`,
    `script-src ${directives.scriptSrc.join(" ")}`,
    `style-src ${directives.styleSrc.join(" ")}`,
    `img-src ${directives.imgSrc.join(" ")}`,
    `font-src ${directives.fontSrc.join(" ")}`,
    `connect-src ${directives.connectSrc.join(" ")}`,
    `frame-src ${directives.frameSrc.join(" ")}`,
    `object-src ${directives.objectSrc.join(" ")}`,
    `base-uri ${directives.baseUri.join(" ")}`,
  ];

  return parts.join("; ");
}

// ---------- CSRF Token ----------

export function generateCSRFToken(): string {
  return randomBytes(32).toString("hex");
}

export function validateCSRFToken(token: string, expected: string): boolean {
  if (!token || !expected) return false;
  if (token.length !== expected.length) return false;
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// ---------- XSS Detection ----------

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i, // onerror=, onclick=, etc.
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /&#x?[0-9a-f]+;/i, // HTML entities used for obfuscation
  /data:text\/html/i,
  /vbscript:/i,
];

export function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

// ---------- Security Headers ----------

export interface SecurityHeader {
  key: string;
  value: string;
  description: string;
}

export function getSecurityHeaders(): SecurityHeader[] {
  return [
    {
      key: "X-Frame-Options",
      value: "DENY",
      description: "Prevents clickjacking by disabling iframe embedding",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
      description: "Prevents MIME type sniffing",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
      description: "Controls referrer information sent to other origins",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
      description: "Disables unnecessary browser features",
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "on",
      description: "Enables DNS prefetching for performance",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
      description: "Enforces HTTPS for 2 years with preload",
    },
    {
      key: "Content-Security-Policy",
      value: buildCSP(),
      description: "Controls allowed sources for content loading",
    },
  ];
}

// ---------- Rate Limit Audit ----------

export interface RateLimitConfig {
  ipLimit: number;
  userDailyLimit: number;
  cooldownSeconds: number;
  maxInputTokens: number;
}

export function validateRateLimitConfig(config: RateLimitConfig): string[] {
  const issues: string[] = [];

  if (config.ipLimit < 100) {
    issues.push("IP rate limit too low — may block legitimate users.");
  }
  if (config.ipLimit > 10000) {
    issues.push("IP rate limit too high — may not prevent abuse.");
  }
  if (config.userDailyLimit < 50) {
    issues.push("User daily limit too low — poor user experience.");
  }
  if (config.cooldownSeconds < 1) {
    issues.push("Cooldown too short — allows burst abuse.");
  }
  if (config.maxInputTokens > 10000) {
    issues.push("Max input tokens too high — may allow prompt injection.");
  }

  return issues;
}

// ---------- Sensitive Data Check ----------

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /credential/i,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
];

export function containsSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

export { DEFAULT_CSP };
