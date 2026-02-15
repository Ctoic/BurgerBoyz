import type { CookieOptions } from "express";

const resolveSameSite = (): "lax" | "strict" | "none" => {
  const raw = process.env.COOKIE_SAME_SITE?.trim().toLowerCase();
  if (raw === "strict" || raw === "none" || raw === "lax") {
    return raw;
  }
  return "lax";
};

export const buildAuthCookieOptions = (maxAge: number): CookieOptions => {
  const isSecure = process.env.COOKIE_SECURE === "true";
  const configuredSameSite = resolveSameSite();
  const sameSite =
    configuredSameSite === "none" && !isSecure ? "lax" : configuredSameSite;
  const domain =
    process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN !== "localhost"
      ? process.env.COOKIE_DOMAIN
      : undefined;

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    domain,
    maxAge,
  };
};

