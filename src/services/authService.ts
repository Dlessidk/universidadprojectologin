export interface UsuarioSesion {
  id: string;
  telefono: string;
  nombre?: string;
  rol: 'ciudadano' | 'admin';
  token?: string;
}

const SESSION_KEY = 'gobnic_sesion_activa';
const LOCAL_USERS_KEY = 'gobnic_local_users_dev';

function limpiarTelefono(telefonoInput: string): string {
  return (telefonoInput || '').replace(/\D/g, '').replace(/^505/, '');
}

function esTelefonoValido(tel: string): boolean {
  return /^[578][0-9]{7}$/.test(tel);
}

function usarFallbackDev(): boolean {
  return import.meta.env.DEV && !import.meta.env.VITE_FORCE_API;
}

export function obtenerSesion(): UsuarioSesion | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
  } catch {
    return null;
  }
}

export function cerrarSesion(): void {
  localStorage.removeItem(SESSION_KEY);
}

function guardarSesion(usuario: UsuarioSesion): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
}

export async function iniciarSesion(
  telefonoInput: string,
  password: string
): Promise<{ ok: boolean; error?: string; usuario?: UsuarioSesion }> {
  const tel = limpiarTelefono(telefonoInput);

  if (!esTelefonoValido(tel)) {
    return { ok: false, error: 'Ingresa un número móvil válido de Nicaragua (inicia en 5, 7 u 8).' };
  }

  if (usarFallbackDev()) {
    if (tel === '88888888' && password === 'Prueba2026#') {
      const usuario: UsuarioSesion = {
        id: 'dev-88888888',
        telefono: '88888888',
        nombre: 'Usuario Prueba Nicaragua',
        rol: 'ciudadano',
        token: 'dev-token'
      };
      guardarSesion(usuario);
      return { ok: true, usuario };
    }
    if (tel === '80000001' && password === 'AdminNic2026#') {
      const usuario: UsuarioSesion = {
        id: 'dev-admin',
        telefono: '80000001',
        nombre: 'Administrador Sistema',
        rol: 'admin',
        token: 'dev-token'
      };
      guardarSesion(usuario);
      return { ok: true, usuario };
    }

    const locales = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    if (locales[tel] && locales[tel].password === password) {
      const usuario: UsuarioSesion = {
        id: locales[tel].id,
        telefono: tel,
        nombre: locales[tel].nombre,
        rol: locales[tel].rol,
        token: 'dev-token'
      };
      guardarSesion(usuario);
      return { ok: true, usuario };
    }

    return { ok: false, error: 'Credenciales incorrectas (modo desarrollo local).' };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono: tel, password })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Error al iniciar sesión.' };
    }

    const usuario: UsuarioSesion = { ...data.usuario, token: data.token };
    guardarSesion(usuario);
    return { ok: true, usuario };
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servidor de autenticación.' };
  }
}

export async function solicitarRegistroOTP(
  telefonoInput: string,
  password: string
): Promise<{ ok: boolean; error?: string; codigoDebug?: string }> {
  const tel = limpiarTelefono(telefonoInput);

  if (!esTelefonoValido(tel)) {
    return { ok: false, error: 'Ingresa un número móvil válido de Nicaragua (inicia en 5, 7 u 8).' };
  }

  if (!password || password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  if (usarFallbackDev()) {
    const codigoDebug = '12345';
    localStorage.setItem(`otp_dev_${tel}`, JSON.stringify({ codigo: codigoDebug, password }));
    return { ok: true, codigoDebug };
  }

  try {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono: tel, password })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'No se pudo enviar el código OTP.' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Error de conexión al solicitar el código OTP.' };
  }
}

export async function verificarCodigoOTP(
  telefonoInput: string,
  codigoIngresado: string
): Promise<{ ok: boolean; error?: string; usuario?: UsuarioSesion }> {
  const tel = limpiarTelefono(telefonoInput);
  const codigo = (codigoIngresado || '').trim();

  if (!esTelefonoValido(tel) || !/^[0-9]{5}$/.test(codigo)) {
    return { ok: false, error: 'Ingresa un código válido de 5 dígitos.' };
  }

  if (usarFallbackDev()) {
    const raw = localStorage.getItem(`otp_dev_${tel}`);
    if (!raw) return { ok: false, error: 'No hay un código pendiente en modo local.' };

    const { codigo: esperado, password } = JSON.parse(raw);
    if (codigo !== esperado) {
      return { ok: false, error: 'Código incorrecto (en modo dev usa 12345).' };
    }

    const usuario: UsuarioSesion = {
      id: `dev-${tel}`,
      telefono: tel,
      nombre: 'Ciudadano',
      rol: tel === '80000001' ? 'admin' : 'ciudadano',
      token: 'dev-token'
    };

    const locales = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    locales[tel] = { ...usuario, password };
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(locales));
    localStorage.removeItem(`otp_dev_${tel}`);

    guardarSesion(usuario);
    return { ok: true, usuario };
  }

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono: tel, codigo })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Código OTP inválido.' };
    }

    const usuario: UsuarioSesion = { ...data.usuario, token: data.token };
    guardarSesion(usuario);
    return { ok: true, usuario };
  } catch {
    return { ok: false, error: 'Error de conexión al verificar el código OTP.' };
  }
}

export const authService = {
  obtenerSesion,
  cerrarSesion,
  iniciarSesion,
  solicitarRegistroOTP,
  verificarCodigoOTP,
};
