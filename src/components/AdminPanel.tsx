import { useState, useEffect } from 'react';
import { ShieldCheck, Lock, RefreshCw, Eye, X, Trash2, ExternalLink, CheckCircle, AlertTriangle, XCircle, Award } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Solicitud {
  id: number;
  codigo_solicitud: string;
  identificacion: string;
  nombre: string;
  telefono: string;
  procedencia: string;
  tramite: string;
  categorias: string[] | string | null;
  total_pagar: number;
  foto_cedula_frontal: string | null;
  foto_cedula_reverso: string | null;
  estado?: string | null;
}

export default function AdminPanel({ onVolver }: { onVolver: () => void }) {
  const [clave, setClave] = useState('');
  const [auth, setAuth] = useState(sessionStorage.getItem('admin_ok') === 'true');
  const [datos, setDatos] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(false);
  const [verFoto, setVerFoto] = useState<Solicitud | null>(null);

  useEffect(() => {
    if (auth) cargarDatosSupabase();
  }, [auth]);

  const cargarDatosSupabase = async () => {
    setCargando(true);
    const { data, error } = await supabase.from('solicitudes').select('*').order('id', { ascending: false });
    if (!error && data) {
      setDatos(data as Solicitud[]);
    }
    setCargando(false);
  };

  const eliminarRegistro = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro permanentemente?')) return;
    const { error } = await supabase.from('solicitudes').delete().eq('id', id);
    if (!error) {
      setDatos(d => d.filter(s => s.id !== id));
    } else {
      alert('Error al eliminar de Supabase');
    }
  };

  const gestionarSolicitud = async (s: Solicitud, estadoObjetivo: string) => {
    const nuevoEstado = s.estado === estadoObjetivo ? null : estadoObjetivo;

    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: nuevoEstado })
      .eq('id', s.id);

    if (error) {
      console.error('Error al actualizar estado en Supabase:', error);
      alert('Error al guardar en Supabase. Asegúrate de tener la política UPDATE guardada.');
      return;
    }

    setDatos(prev => prev.map(item => item.id === s.id ? { ...item, estado: nuevoEstado } : item));

    if (nuevoEstado) {
      const tel = s.telefono ? s.telefono.replace(/\D/g, '') : '';
      if (!tel) {
        alert('El ciudadano no tiene un número de teléfono válido.');
        return;
      }

      let catsTexto = Array.isArray(s.categorias) ? s.categorias.join(', ') : (s.categorias || 'N/D');
      let msg = '';
      if (nuevoEstado === 'APROBADO') {
        msg = `🚔 *POLICÍA NACIONAL DE NICARAGUA*\n*Dirección de Tránsito Nacional*\n\nEstimado(a) *${s.nombre}*,\n\nSu solicitud con código *${s.codigo_solicitud}* ha sido *APROBADA* exitosamente.\n• Trámite: ${s.tramite}\n• Categorías: ${catsTexto}\n• Arancel: C$ ${s.total_pagar || 0}`;
      } else if (nuevoEstado === 'OBSERVADO') {
        msg = `🚔 *TRÁNSITO NACIONAL*\n\nEstimado(a) *${s.nombre}*,\n\nSu solicitud (*${s.codigo_solicitud}*) tiene observaciones en los documentos. Por favor repita el proceso con imágenes claras.`;
      } else if (nuevoEstado === 'RECHAZADO') {
        msg = `🚔 *TRÁNSITO NACIONAL*\n\nEstimado(a) *${s.nombre}*,\n\nSu solicitud (*${s.codigo_solicitud}*) ha sido *RECHAZADA* por inconsistencias en la documentación.`;
      }

      window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  if (!auth) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#f0f2f5]">
        <form onSubmit={e => { 
          e.preventDefault(); 
          if(clave === 'PolNac2026_Sec#99') { 
            sessionStorage.setItem('admin_ok','true'); 
            setAuth(true); 
          } else { 
            alert('Contraseña de seguridad incorrecta.'); 
          } 
        }} className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full space-y-4 border border-gray-200">
          <div className="text-center">
            <Lock className="w-10 h-10 mx-auto text-[#1a3a6b] mb-2" />
            <h2 className="font-bold text-gray-800 text-lg">Consola Segura</h2>
            <p className="text-xs text-gray-500">Acceso restringido - Tránsito Nacional</p>
          </div>
          <input 
            type="password" 
            placeholder="Contraseña de administrador..." 
            value={clave} 
            onChange={e => setClave(e.target.value)} 
            className="w-full border p-2.5 rounded text-sm focus:outline-none focus:border-blue-700" 
            autoFocus 
          />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onVolver} className="w-1/2 border py-2 rounded text-xs text-gray-600 hover:bg-gray-50 cursor-pointer">Volver</button>
            <button type="submit" className="w-1/2 bg-[#1a3a6b] hover:bg-blue-900 text-white py-2 rounded text-xs font-semibold cursor-pointer">Desbloquear</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="bg-[#1a3a6b] text-white p-4 rounded-lg mb-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-yellow-400" />
          <div>
            <h1 className="font-bold text-sm">Panel Policial Oficial — Registros Activos ({datos.length})</h1>
            <p className="text-[11px] text-blue-200">Sincronizado en tiempo real con Supabase</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarDatosSupabase} className="bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded text-xs flex items-center gap-1 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`}/> Sincronizar
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_ok'); setAuth(false); }} className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-xs cursor-pointer">Bloquear</button>
          <button onClick={onVolver} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-xs cursor-pointer">Ir al Form</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 border-b text-gray-700 uppercase font-bold">
            <tr>
              <th className="p-3">Código / Estado</th>
              <th className="p-3">Ciudadano</th>
              <th className="p-3">Contacto / Depto</th>
              <th className="p-3">Trámite & Categorías</th>
              <th className="p-3">Documentos</th>
              <th className="p-3 text-center">Gestión & WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {datos.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">No se encontraron solicitudes registradas en la base de datos de Supabase.</td></tr>
            ) : (
              datos.map(s => {
                let catsDisplay = Array.isArray(s.categorias) ? s.categorias.join(', ') : (s.categorias || 'N/D');
                return (
                  <tr key={s.id} className="hover:bg-blue-50/40">
                    <td className="p-3">
                      <p className="font-mono font-bold text-[#1a3a6b]">{s.codigo_solicitud}</p>
                      <div className="mt-1 cursor-pointer" onClick={() => gestionarSolicitud(s, s.estado || '')} title="Clic para limpiar estado">
                        {s.estado === 'APROBADO' && <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded font-bold border border-green-300"><CheckCircle className="w-3 h-3"/> APROBADO</span>}
                        {s.estado === 'OBSERVADO' && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-300"><AlertTriangle className="w-3 h-3"/> OBSERVADO</span>}
                        {s.estado === 'RECHAZADO' && <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-bold border border-red-300"><XCircle className="w-3 h-3"/> RECHAZADO</span>}
                        {(!s.estado || s.estado === '') && <span className="inline-block bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-semibold border border-gray-300">PENDIENTE</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-gray-900">{s.nombre}</p>
                      <p className="font-mono text-gray-500 text-[11px]">{s.identificacion}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-blue-700">{s.telefono}</p>
                      <p className="text-gray-500 text-[11px]">{s.procedencia}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-gray-800">{s.tramite}</p>
                      <div className="flex items-center gap-1 text-blue-700 font-bold mt-0.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" /> 
                        <span>Cat: {catsDisplay}</span>
                      </div>
                      <p className="text-green-700 font-bold mt-0.5">C$ {s.total_pagar?.toLocaleString()}</p>
                    </td>
                    <td className="p-3">
                      <button onClick={() => setVerFoto(s)} className="text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
                        <Eye className="w-3.5 h-3.5"/> Ver Fotos
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button 
                          onClick={() => gestionarSolicitud(s, 'APROBADO')} 
                          className={`px-2.5 py-1 rounded font-semibold cursor-pointer shadow-sm text-white ${s.estado === 'APROBADO' ? 'bg-green-800 ring-2 ring-green-400' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                          {s.estado === 'APROBADO' ? '✓ Aprobado' : 'Aprobar'}
                        </button>
                        <button 
                          onClick={() => gestionarSolicitud(s, 'OBSERVADO')} 
                          className={`px-2.5 py-1 rounded font-semibold cursor-pointer text-white ${s.estado === 'OBSERVADO' ? 'bg-amber-700 ring-2 ring-amber-400' : 'bg-amber-500 hover:bg-amber-600'}`}
                        >
                          {s.estado === 'OBSERVADO' ? '✓ Observado' : 'Observar'}
                        </button>
                        <button 
                          onClick={() => gestionarSolicitud(s, 'RECHAZADO')} 
                          className={`px-2.5 py-1 rounded font-semibold cursor-pointer text-white ${s.estado === 'RECHAZADO' ? 'bg-red-800 ring-2 ring-red-400' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                          {s.estado === 'RECHAZADO' ? '✓ Rechazado' : 'Rechazar'}
                        </button>
                        <button onClick={() => eliminarRegistro(s.id)} className="text-gray-400 hover:text-red-600 p-1 cursor-pointer" title="Eliminar registro"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {verFoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1a3a6b]">Cédula de Identidad — {verFoto.nombre}</h3>
                <p className="text-xs text-gray-500 font-mono">Código: {verFoto.codigo_solicitud} | Cédula: {verFoto.identificacion}</p>
              </div>
              <button onClick={() => setVerFoto(null)} className="text-gray-500 hover:text-black p-1 rounded-full hover:bg-gray-100 cursor-pointer"><X className="w-6 h-6"/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto bg-gray-50 p-4 rounded border">
              <div className="text-center bg-white p-3 border rounded shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Vista Frontal</p>
                  {verFoto.foto_cedula_frontal ? (
                    <div className="space-y-2">
                      <img src={verFoto.foto_cedula_frontal} className="border rounded max-h-72 mx-auto object-contain w-full bg-gray-900" alt="Frontal" />
                    </div>
                  ) : <span className="text-xs text-red-500 font-semibold">No hay URL frontal registrada</span>}
                </div>
                {verFoto.foto_cedula_frontal && (
                  <a href={verFoto.foto_cedula_frontal} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 py-1.5 px-3 rounded font-semibold transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir imagen frontal en pestaña nueva
                  </a>
                )}
              </div>
              <div className="text-center bg-white p-3 border rounded shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Vista Reverso</p>
                  {verFoto.foto_cedula_reverso ? (
                    <div className="space-y-2">
                      <img src={verFoto.foto_cedula_reverso} className="border rounded max-h-72 mx-auto object-contain w-full bg-gray-900" alt="Reverso" />
                    </div>
                  ) : <span className="text-xs text-red-500 font-semibold">No hay URL reverso registrada</span>}
                </div>
                {verFoto.foto_cedula_reverso && (
                  <a href={verFoto.foto_cedula_reverso} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 py-1.5 px-3 rounded font-semibold transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir imagen reverso en pestaña nueva
                  </a>
                )}
              </div>
            </div>
            <div className="text-right pt-2">
              <button onClick={() => setVerFoto(null)} className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-5 py-2 rounded font-semibold cursor-pointer">Cerrar Ventana</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
