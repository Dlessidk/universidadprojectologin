import { supabase } from '../supabaseClient';

export interface UsuarioSesion {
  id: string;
  telefono: string;
  rol: 'usuario' | 'admin';
  verificado: boolean;
}

const SESSION_KEY = 'gobnic_sesion_activa';
const MOCK_USERS_KEY = 'gobnic_usuarios_prueba';

// Usuario de prueba inicial siempre disponible
const USUARIO_TEST_DEFAULT = {
  id: 'test-user-001',
  telefono: '88888888',
  passwordHash: 'Prueba2026#',
  rol: 'usuario' as const,
  verificado: true,
};

function getMockUsers() {
  const raw = localStorage.getItem(MOCK_USERS_KEY);
  if (!raw) {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([USUARIO_TEST_DEFAULT]));
    return [USUARIO_TEST_DEFAULT];
  }
  return JSON.parse(raw);
}

// Hash SHA-256 nativo del navegador para no guardar contraseñas en texto plano
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Limpia el número dejando solo los 8 dígitos locales de Nicaragua
export function normalizarTelefono(input: string): string {
  const soloDigitos = input.replace(/\D/g, '');
  if (soloDigitos.startsWith('505') && soloDigitos.length === 11) {
    return soloDigitos.slice(3);
  }
  return soloDigitos;
}

export const authService = {
  obtenerSesion(): UsuarioSesion | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  cerrarSesion(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  async iniciarSesion(telefonoInput: string, password: string): Promise<{ ok: boolean; error?: string; usuario?: UsuarioSesion }> {
    const telefono = normalizarTelefono(telefonoInput);
    if (telefono.length !== 8) {
      return { ok: false, error: 'Ingresa un número válido de 8 dígitos (ej. 88888888).' };
    }

    const users = getMockUsers();
    const passHash = await hashPassword(password);

    // 1. Verificar contra usuarios locales / usuario de prueba
    const localUser = users.find(
      (u: any) => u.telefono === telefono && (u.passwordHash === password || u.passwordHash === passHash)
    );

    if (localUser) {
      if (!localUser.verificado) {
        return { ok: false, error: 'Esta cuenta aún no ha verificado su código de WhatsApp.' };
      }
      const sesion: UsuarioSesion = {
        id: localUser.id,
        telefono: localUser.telefono,
        rol: localUser.rol,
        verificado: true,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
      return { ok: true, usuario: sesion };
    }

    // 2. Intentar contra Supabase si está configurado
    try {
      const { data, error } = await supabase
        .from('usuarios_app')
        .select('id, telefono, password_hash, rol, verificado')
        .eq('telefono', telefono)
        .single();

      if (!error && data && data.password_hash === passHash) {
        if (!data.verificado) {
          return { ok: false, error: 'Cuenta pendiente de verificación por WhatsApp.' };
        }
        const sesion: UsuarioSesion = {
          id: data.id,
          telefono: data.telefono,
          rol: data.rol || 'usuario',
          verificado: true,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
        return { ok: true, usuario: sesion };
      }
    } catch {
      // Fallback silencioso si Supabase aún está en modo mock
    }

    return { ok: false, error: 'Número de teléfono o contraseña incorrectos.' };
  },

  // Paso 1 de Crear Cuenta: genera OTP de 5 dígitos y dispara envío (listo para Evolution API)
  async solicitarRegistroOTP(
    telefonoInput: string,
    password: string
  ): Promise<{ ok: boolean; error?: string; codigoDebug?: string }> {
    const telefono = normalizarTelefono(telefonoInput);
    if (telefono.length !== 8) {
      return { ok: false, error: 'Ingresa un número de Nicaragua válido (8 dígitos).' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const users = getMockUsers();
    const existente = users.find((u: any) => u.telefono === telefono && u.verificado);
    if (existente) {
      return { ok: false, error: 'Este número ya tiene una cuenta registrada. Inicia sesión.' };
    }

    // Generar código aleatorio de 5 dígitos
    const codigoOTP = Math.floor(10000 + Math.random() * 90000).toString();
    const expiraEn = Date.now() + 5 * 60 * 1000; // 5 minutos
    const passHash = await hashPassword(password);

    const filtrados = users.filter((u: any) => u.telefono !== telefono);
    filtrados.push({
      id: `usr-${Date.now()}`,
      telefono,
      passwordHash: passHash,
      rol: 'usuario',
      verificado: false,
      otp: codigoOTP,
      otpExpira: expiraEn,
    });
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(filtrados));

    // Aquí se conectará el fetch a tu servidor Evolution API / Baileys:
    // await fetch(import.meta.env.VITE_EVOLUTION_API_URL + '/message/sendText/instancia', { ... })
    console.info(`[SIMULACIÓN WHATSAPP -> +505 ${telefono}] Tu código de verificación es: ${codigoOTP}`);

    return { ok: true, codigoDebug: codigoOTP };
  },

  // Paso 2 de Crear Cuenta: valida los 5 dígitos (if codigo === true -> inicia sesión)
  async verificarCodigoOTP(
    telefonoInput: string,
    codigoIngresado: string
  ): Promise<{ ok: boolean; error?: string; usuario?: UsuarioSesion }> {
    const telefono = normalizarTelefono(telefonoInput);
    const users = getMockUsers();
    const idx = users.findIndex((u: any) => u.telefono === telefono);

    if (idx === -1) {
      return { ok: false, error: 'No se encontró una solicitud de registro para este número.' };
    }

    const user = users[idx];
    if (Date.now() > user.otpExpira) {
      return { ok: false, error: 'El código de 5 dígitos expiró. Solicita uno nuevo.' };
    }

    if (user.otp !== codigoIngresado) {
      return { ok: false, error: 'Código incorrecto. Verifica los 5 dígitos enviados a tu WhatsApp.' };
    }

    // Código válido: activar cuenta y crear sesión
    users[idx].verificado = true;
    delete users[idx].otp;
    delete users[idx].otpExpira;
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

    // Guardar también en Supabase si está conectado
    try {
      await supabase.from('usuarios_app').insert([
        {
          telefono: user.telefono,
          password_hash: user.passwordHash,
          rol: 'usuario',
          verificado: true,
        },
      ]);
    } catch {
      // Ignorar si aún no hay tabla en Supabase
    }

    const sesion: UsuarioSesion = {
      id: user.id,
      telefono: user.telefono,
      rol: user.rol,
      verificado: true,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));

    return { ok: true, usuario: sesion };
  },
};
