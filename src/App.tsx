import { useState, useEffect } from 'react';
import Header from './components/Header';
import RegistrationForm from './components/RegistrationForm';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';

export default function App() {
  const [verAdmin, setVerAdmin] = useState(false);

  // Atajo de teclado secreto: Ctrl + Shift + A para abrir el panel de administración de forma oculta
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        setVerAdmin(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] relative">
      <Header />
      <div className="flex-grow">
        {verAdmin ? <AdminPanel onVolver={() => setVerAdmin(false)} /> : <RegistrationForm />}
      </div>
      <Footer />
    </div>
  );
}
