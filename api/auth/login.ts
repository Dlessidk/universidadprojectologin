import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  supabaseAdmin,
  limpiarTelefonoNicaragua,
  esTelefonoNicaraguaValido,
  firmarTokenSesion
} from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const { telefono, password } = req.body as { telefono?: string; password?: string };
    const telLimpio = limpiarTelefonoNicaragua(telefono || '');

    if (!esTelefonoNicaraguaValido(telLimpio) || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Ingresa un número móvil válido de Nicaragua (8 dígitos) y tu contraseña.'
      });
    }

    const { data, error } = await supabaseAdmin.rpc('verificar_credenciales_app', {
      p_telefono: telLimpio,
      p_password: password
    });

    if (error) throw error;

    const usuario = Array.isArray(data) ? data[0] : data;

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        error: 'Teléfono o contraseña incorrectos, o cuenta pendiente de verificación.'
      });
    }

    const token = firmarTokenSesion({
      id: usuario.id,
      telefono: usuario.telefono,
      rol: usuario.rol,
      exp: Date.now() + 12 * 60 * 60 * 1000
    });

    return res.status(200).json({
      ok: true,
      token,
      usuario: {
        id: usuario.id,
        telefono: usuario.telefono,
        nombre: usuario.nombre_completo,
        rol: usuario.rol,
        token
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ ok: false, error: 'Error interno al iniciar sesión.' });
  }
}
