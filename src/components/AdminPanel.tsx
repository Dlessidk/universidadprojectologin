import { useEffect, useState } from 'react';
import { obtenerSesion } from '../services/authService';

interface AdminPanelProps {
  onClose?: () => void;
  onVolver?: () => void;
}

export default function AdminPanel({ onClose, onVolver }: AdminPanelProps) {
  const sesion = obtenerSesion();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const handleSalir = onClose || onVolver;

  useEffect(() => {
    if (!sesion || sesion.rol !== 'admin' || !sesion.token) {
      setErrorAcceso('Acceso denegado. Inicia sesión con una cuenta de administrador.');
      setCargando(false);
      return;
    }

    const cargarSolicitudes = async () => {
      try {
        const res = await fetch('/api/admin/solicitudes', {
          headers: { Authorization: `Bearer ${sesion.token}` }
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'No autorizado');
        }
        setSolicitudes(data.solicitudes || []);
      } catch (err: any) {
        setErrorAcceso(err.message || 'Error al cargar solicitudes.');
      } finally {
        setCargando(false);
      }
    };

    cargarSolicitudes();
  }, []);

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    if (!sesion?.token) return;
    try {
      const res = await fetch('/api/admin/solicitudes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token}`
        },
        body: JSON.stringify({ id, estado: nuevoEstado })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSolicitudes((prev) =>
          prev.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
        );
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  if (cargando) {
    return <div className="p-8 text-center text-slate-600">Verificando sesión de administrador...</div>;
  }

  if (errorAcceso) {
    return (
      <div className="max-w-md mx-auto my-10 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <h2 className="text-lg font-bold text-red-700 mb-2">Acceso Restringido</h2>
        <p className="text-sm text-red-600 mb-4">{errorAcceso}</p>
        {handleSalir && (
          <button
            onClick={handleSalir}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm"
          >
            Volver
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Panel Administrativo de Solicitudes</h2>
        {handleSalir && (
          <button
            onClick={handleSalir}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 text-sm font-medium"
          >
            Volver
          </button>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Teléfono</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitudes.map((sol) => (
              <tr key={sol.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">{sol.telefono}</td>
                <td className="px-4 py-3">{sol.nombre_completo || sol.nombre || '—'}</td>
                <td className="px-4 py-3 font-medium">{sol.estado}</td>
                <td className="px-4 py-3">
                  <select
                    value={sol.estado}
                    onChange={(e) => actualizarEstado(sol.id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
