import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

export function limpiarTelefonoNicaragua(input: string): string {
  return (input || '').replace(/\D/g, '').replace(/^505/, '');
}

export function esTelefonoNicaraguaValido(tel: string): boolean {
  return /^[578][0-9]{7}$/.test(tel);
}

export function hashSha256(valor: string): string {
  return crypto.createHash('sha256').update(valor).digest('hex');
}

export interface TokenPayload {
  id: string;
  telefono: string;
  rol: 'ciudadano' | 'admin';
  exp: number;
}

export function firmarTokenSesion(payload: TokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const firma = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(data)
    .digest('base64url');
  return `${data}.${firma}`;
}

export function verificarTokenSesion(token?: string): TokenPayload | null {
  if (!token || !token.includes('.')) return null;
  const [data, firma] = token.split('.');
  const firmaEsperada = crypto
    .createHmac('sha256', serviceRoleKey)
    .update(data)
    .digest('base64url');

  if (firma !== firmaEsperada) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as TokenPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
