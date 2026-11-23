import { useState, useEffect } from 'react';
import { LogOut, UserCheck } from 'lucide-react';
import Header from './components/Header';
import LoginView from './components/LoginView';
import RegistrationForm from './components/RegistrationForm';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';
import { authService, UsuarioSesion } from './services/authService';

export default function App() {
  const [sesion, setSesion] = useState<UsuarioSesion | null>(() => authService.obtenerSesion());
  const [verAdmin, setVerAdmin] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        setVerAdmin((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCerrarSesion = () => {
    authService.cerrarSesion();
    setSesion(null);
    setVerAdmin(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] relative">
      <Header />

      {/* Barra de sesión activa */}
      {sesion && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <UserCheck className="w-4 h-4 text-green-600" />
              <span>
                Sesión activa: <strong>+505 {sesion.telefono}</strong>
              </span>
            </div>
            <button
              onClick={handleCerrarSesion}
              className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-800 font-medium px-2.5 py-1 rounded hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow">
        {!sesion ? (
          <LoginView onLoginSuccess={(usuario) => setSesion(usuario)} />
        ) : verAdmin ? (
          <AdminPanel onVolver={() => setVerAdmin(false)} />
        ) : (
          <RegistrationForm telefonoSesion={sesion.telefono} />
        )}
      </div>

      <Footer />
    </div>
  );
}
