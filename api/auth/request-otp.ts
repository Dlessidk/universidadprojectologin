import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import {
  supabaseAdmin,
  limpiarTelefonoNicaragua,
  esTelefonoNicaraguaValido,
  hashSha256
} from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const { telefono, password } = req.body as { telefono?: string; password?: string };
    const telLimpio = limpiarTelefonoNicaragua(telefono || '');

    if (!esTelefonoNicaraguaValido(telLimpio)) {
      return res.status(400).json({
        ok: false,
        error: 'Número móvil de Nicaragua inválido. Debe iniciar en 5, 7 u 8 y tener 8 dígitos.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        ok: false,
        error: 'La contraseña debe tener al menos 6 caracteres.'
      });
    }

    const otp = crypto.randomInt(10000, 100000).toString();
    const otpHash = hashSha256(otp);
    const expiraEn = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: existente } = await supabaseAdmin
      .from('usuarios_app')
      .select('id')
      .eq('telefono', telLimpio)
      .maybeSingle();

    if (existente) {
      const { error: updateErr } = await supabaseAdmin
        .from('usuarios_app')
        .update({
          otp_hash: otpHash,
          otp_expira_en: expiraEn,
          otp_intentos: 0,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', existente.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('usuarios_app')
        .insert({
          telefono: telLimpio,
          nombre_completo: 'Ciudadano',
          otp_hash: otpHash,
          otp_expira_en: expiraEn,
          otp_intentos: 0,
          verificado: false
        });

      if (insertErr) throw insertErr;
    }

    const { error: passErr } = await supabaseAdmin.rpc('actualizar_password_usuario', {
      p_telefono: telLimpio,
      p_password: password
    });
    if (passErr) throw passErr;

    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    const evoInstance = process.env.EVOLUTION_INSTANCE_NAME;

    if (!evoUrl || !evoKey || !evoInstance) {
      return res.status(500).json({
        ok: false,
        error: 'Configuración de Evolution API incompleta en el servidor.'
      });
    }

    const evoRes = await fetch(`${evoUrl.replace(/\/$/, '')}/message/sendText/${evoInstance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: evoKey
      },
      body: JSON.stringify({
        number: `505${telLimpio}`,
        text: `🔐 *Código de Verificación*\n\nTu código de acceso es: *${otp}*\n\nVálido por 5 minutos. No compartas este código con nadie.`
      })
    });

    if (!evoRes.ok) {
      const detalle = await evoRes.text();
      console.error('Error Evolution API:', detalle);
      return res.status(502).json({
        ok: false,
        error: 'No se pudo enviar el código por WhatsApp. Verifica que el número tenga WhatsApp activo.'
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en request-otp:', err);
    return res.status(500).json({ ok: false, error: 'Error interno al solicitar el código OTP.' });
  }
}
