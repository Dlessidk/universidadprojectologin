import React, { useState, useRef } from 'react';
import { Phone, Lock, User, ArrowRight, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { authService, UsuarioSesion } from '../services/authService';

interface LoginViewProps {
  onLoginSuccess: (usuario: UsuarioSesion) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [modo, setModo] = useState<'login' | 'registro' | 'otp'>('login');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '']);
  const [codigoSimulado, setCodigoSimulado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const res = await authService.iniciarSesion(telefono, password);
    setCargando(false);

    if (!res.ok || !res.usuario) {
      setError(res.error || 'Error al iniciar sesión.');
      return;
    }
    onLoginSuccess(res.usuario);
  };

  const handleSolicitarOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const res = await authService.solicitarRegistroOTP(telefono, password);
    setCargando(false);

    if (!res.ok) {
      setError(res.error || 'No se pudo enviar el código.');
      return;
    }
    setCodigoSimulado(res.codigoDebug || null);
    setOtpDigits(['', '', '', '', '']);
    setModo('otp');
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digito = value.replace(/\D/g, '').slice(-1);
    const nuevoOtp = [...otpDigits];
    nuevoOtp[index] = digito;
    setOtpDigits(nuevoOtp);
    setError(null);

    if (digito && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    // Si completó los 5 dígitos, validar automáticamente
    if (nuevoOtp.every((d) => d !== '')) {
      verificarCodigoCompleto(nuevoOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (!pegado) return;
    const nuevoOtp = ['', '', '', '', ''];
    pegado.split('').forEach((char, idx) => {
      nuevoOtp[idx] = char;
    });
    setOtpDigits(nuevoOtp);
    if (pegado.length === 5) {
      verificarCodigoCompleto(pegado);
    } else {
      inputRefs.current[pegado.length]?.focus();
    }
  };

  const verificarCodigoCompleto = async (codigo: string) => {
    setCargando(true);
    const res = await authService.verificarCodigoOTP(telefono, codigo);
    setCargando(false);

    if (!res.ok || !res.usuario) {
      setError(res.error || 'Código inválido.');
      return;
    }
    onLoginSuccess(res.usuario);
  };

  const rellenarPrueba = () => {
    setTelefono('88888888');
    setPassword('Prueba2026#');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto my-10 px-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Franja superior institucional */}
        <div className="bg-[#003366] px-6 py-5 text-white text-center">
          <h2 className="text-xl font-bold tracking-wide">
            {modo === 'login' && 'Inicio de Sesión'}
            {modo === 'registro' && 'Crear Cuenta'}
            {modo === 'otp' && 'Verificación por WhatsApp'}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            {modo === 'login' && 'Ingresa con tu número telefónico registrado'}
            {modo === 'registro' && 'Recibirás un código de 5 dígitos en tu WhatsApp'}
            {modo === 'otp' && `Enviamos un código al +505 ${telefono}`}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* VISTA 1A: INICIO DE SESIÓN */}
          {modo === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Número telefónico
                </label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#003366]">
                  <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 text-sm font-medium border-r border-gray-300">
                    +505
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      maxLength={8}
                      required
                      placeholder="88888888"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2.5 text-gray-900 outline-none"
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 outline-none focus:ring-2 focus:ring-[#003366]"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-[#003366] hover:bg-[#002244] text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{cargando ? 'Verificando...' : 'Iniciar sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setModo('registro');
                  }}
                  className="w-full py-2 px-4 rounded-lg border-2 border-[#003366] text-[#003366] font-semibold text-sm hover:bg-blue-50 transition"
                >
                  Crear cuenta
                </button>

                {/* Botón rápido de credenciales de prueba para desarrollo */}
                <button
                  type="button"
                  onClick={rellenarPrueba}
                  className="text-xs text-gray-500 hover:text-[#003366] underline mt-1"
                >
                  Rellenar usuario de prueba (88888888 / Prueba2026#)
                </button>
              </div>
            </form>
          )}

          {/* VISTA 1B: CREAR CUENTA (PASO 1 DE TU PLANO) */}
          {modo === 'registro' && (
            <form onSubmit={handleSolicitarOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  1. Ingresa tu número telefónico (WhatsApp)
                </label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#003366]">
                  <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 text-sm font-medium border-r border-gray-300">
                    +505
                  </span>
                  <input
                    type="tel"
                    maxLength={8}
                    required
                    placeholder="Ej. 84123456"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 text-gray-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Define una contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 outline-none focus:ring-2 focus:ring-[#003366]"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <span>{cargando ? 'Enviando código...' : 'Recibir código en WhatsApp'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setModo('login');
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 pt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Inicio de Sesión</span>
              </button>
            </form>
          )}

          {/* VISTA 2: VERIFICACIÓN DE 5 DÍGITOS (PASO 2 DE TU PLANO) */}
          {modo === 'otp' && (
            <div className="space-y-5 text-center">
              {/* Ícono de perfil arriba como en tu boceto */}
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border-2 border-[#003366] flex items-center justify-center text-[#003366]">
                <User className="w-8 h-8" />
              </div>

              <p className="text-sm text-gray-600">
                2. Ingresa el código de verificación de 5 dígitos enviado a tu WhatsApp:
              </p>

              {/* Aviso visual de simulación mientras conectas Evolution API */}
              {codigoSimulado && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                  <strong>Modo prueba (sin Evolution API aún):</strong> Tu código generado es{' '}
                  <span className="font-mono font-bold text-sm tracking-widest">{codigoSimulado}</span>
                </div>
              )}

              {/* Las 5 casillas individuales de tu plano */}
              <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#003366] focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={cargando || otpDigits.some((d) => !d)}
                onClick={() => verificarCodigoCompleto(otpDigits.join(''))}
                className="w-full bg-[#003366] hover:bg-[#002244] text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{cargando ? 'Validando...' : 'Confirmar código e iniciar sesión'}</span>
              </button>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                <button
                  type="button"
                  onClick={() => setModo('registro')}
                  className="hover:text-gray-800 underline"
                >
                  Cambiar número
                </button>
                <button
                  type="button"
                  onClick={handleSolicitarOTP}
                  className="flex items-center gap-1 text-[#003366] hover:underline font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reenviar código</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
