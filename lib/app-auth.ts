import { cookies } from "next/headers";
import { getDatabase, id, nowIso } from "./database";

export const APP_SESSION_COOKIE = "antiaging_session";
const SESSION_DAYS = 30;
// WebCrypto work is counted against the Worker execution budget. This keeps
// password derivation robust while allowing first sign-up to complete reliably
// on the production Worker; rate limiting is still required before broad launch.
const PBKDF2_ITERATIONS = 60_000;

export type AppAuthIdentity = { id: string; email: string; fullName: string };

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function derivePassword(password: string, salt: Uint8Array) {
  const passwordBytes = new TextEncoder().encode(password);
  const passwordBuffer = new Uint8Array(passwordBytes).buffer;
  const saltBuffer = new Uint8Array(salt).buffer;
  const key = await crypto.subtle.importKey("raw", passwordBuffer, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePassword(password, salt);
  return { salt: base64Url(salt), hash: base64Url(derived) };
}

export async function verifyPassword(password: string, encodedSalt: string, encodedHash: string) {
  try {
    const derived = await derivePassword(password, fromBase64Url(encodedSalt));
    return constantTimeEqual(derived, fromBase64Url(encodedHash));
  } catch {
    return false;
  }
}

function sessionCookie(value: string, maxAge: number) {
  return `${APP_SESSION_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function setSessionCookie(headers: Headers, sessionId: string) {
  headers.set("Set-Cookie", sessionCookie(sessionId, SESSION_DAYS * 24 * 60 * 60));
}

export function clearSessionCookie(headers: Headers) {
  headers.set("Set-Cookie", sessionCookie("", 0));
}

export async function createSession(memberId: string) {
  const database = await getDatabase();
  const sessionId = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = nowIso();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await database.prepare("INSERT INTO auth_sessions (id, member_id, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").bind(sessionId, memberId, expires, now, now).run();
  return sessionId;
}

export async function getAppAuthIdentity(): Promise<AppAuthIdentity | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(APP_SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const database = await getDatabase();
  const session = await database.prepare("SELECT s.member_id, s.expires_at, m.email, m.full_name FROM auth_sessions s JOIN members m ON m.id=s.member_id WHERE s.id=?").bind(sessionId).first<{ member_id: string; expires_at: string; email: string; full_name: string }>();
  if (!session) return null;
  if (session.expires_at <= nowIso()) {
    await database.prepare("DELETE FROM auth_sessions WHERE id=?").bind(sessionId).run();
    return null;
  }
  return { id: session.member_id, email: session.email, fullName: session.full_name };
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && value.length <= 200;
}

export function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 120;
}

export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function newMemberId() {
  return id("member");
}
