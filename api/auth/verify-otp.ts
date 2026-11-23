import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  supabaseAdmin,
  limpiarTelefonoNicaragua,
  esTelefonoNicaraguaValido,
  hashSha256,
  firmarTokenSesion
} from '../_lib/supabaseAdmin';

const MAX_INTENTOS_OTP = 3;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const { telefono, codigo } = req.body as { telefono?: string; codigo?: string };
    const telLimpio = limpiarTelefonoNicaragua(telefono || '');
    const codigoLimpio = (codigo || '').trim();

    if (!esTelefonoNicaraguaValido(telLimpio) || !/^[0-9]{5}$/.test(codigoLimpio)) {
      return res.status(400).json({
        ok: false,
        error: 'Teléfono de Nicaragua o código de 5 dígitos inválido.'
      });
    }

    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios_app')
      .select('*')
      .eq('telefono', telLimpio)
      .maybeSingle();

    if (error || !usuario || !usuario.otp_hash) {
      return res.status(404).json({
        ok: false,
        error: 'No existe un código de verificación pendiente para este número.'
      });
    }

    if (usuario.otp_intentos >= MAX_INTENTOS_OTP) {
      return res.status(429).json({
        ok: false,
        error: 'Límite de 3 intentos fallidos excedido. Solicita un nuevo código OTP.'
      });
    }

    if (!usuario.otp_expira_en || new Date(usuario.otp_expira_en).getTime() < Date.now()) {
      return res.status(410).json({
        ok: false,
        error: 'El código OTP ha expirado (5 minutos). Solicita uno nuevo.'
      });
    }

    if (hashSha256(codigoLimpio) !== usuario.otp_hash) {
      const nuevosIntentos = usuario.otp_intentos + 1;
      await supabaseAdmin
        .from('usuarios_app')
        .update({ otp_intentos: nuevosIntentos })
        .eq('id', usuario.id);

      const restantes = MAX_INTENTOS_OTP - nuevosIntentos;
      return res.status(401).json({
        ok: false,
        error:
          restantes > 0
            ? `Código incorrecto. Te quedan ${restantes} intento(s).`
            : 'Código incorrecto. Has agotado los 3 intentos. Solicita un nuevo código.'
      });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('usuarios_app')
      .update({
        verificado: true,
        otp_hash: null,
        otp_expira_en: null,
        otp_intentos: 0,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', usuario.id);

    if (updateErr) throw updateErr;

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
    console.error('Error en verify-otp:', err);
    return res.status(500).json({ ok: false, error: 'Error interno al verificar el código.' });
  }
}
