import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, verificarTokenSesion } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const sesion = verificarTokenSesion(token);

  if (!sesion || sesion.rol !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'Acceso denegado. Se requiere sesión activa con rol administrador.'
    });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('solicitudes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, solicitudes: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, estado } = req.body as { id?: string; estado?: string };
    if (!id || !estado) {
      return res.status(400).json({ ok: false, error: 'Falta id o estado.' });
    }

    const { error } = await supabaseAdmin
      .from('solicitudes')
      .update({ estado })
      .eq('id', id);

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
