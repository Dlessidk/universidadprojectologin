import { useState, useMemo, useEffect } from 'react';
import { Camera, CheckCircle2, Trash2, HelpCircle, FileCheck, Smartphone, Clock, ShieldCheck, Receipt, Copy, Check, Loader2, RotateCcw, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';

const NUMERO_OFICIAL_WHATSAPP = '50586498407';

const tipoDocumentoOptions = ['Cédula Nicaragüense'];
const tramiteOptions = ['', 'Licencia Nueva', 'Renovación', 'Duplicado'];
const procedenciaOptions = ['', 'Managua', 'Masaya', 'Granada', 'León', 'Chinandega', 'Matagalpa', 'Estelí', 'Otro departamento'];

const countryCodes = [
  { code: '+505', country: 'NI (Nicaragua)' },
  { code: '+506', country: 'CR (Costa Rica)' },
  { code: '+1', country: 'US/CA (+1)' },
  { code: '+504', country: 'HN (Honduras)' },
  { code: '+503', country: 'SV (El Salvador)' },
  { code: '+502', country: 'GT (Guatemala)' },
  { code: '+507', country: 'PA (Panamá)' },
  { code: '+52', country: 'MX (México)' },
  { code: '+34', country: 'ES (España)' },
  { code: '+57', country: 'CO (Colombia)' },
];

const categoryPricing: Record<string, { label: string; price: number; desc: string }> = {
  '1': { label: 'Cat. 1', price: 2280, desc: 'Motos hasta 125 cc' },
  '2': { label: 'Cat. 2', price: 2520, desc: 'Motos +125 cc (Requiere/Incluye Cat. 1)' },
  '3': { label: 'Cat. 3', price: 3000, desc: 'Livianos hasta 3.5 ton / 9 pax' },
  '4A': { label: 'Cat. 4A', price: 3840, desc: 'Camiones 4-8 ton' },
  '4B': { label: 'Cat. 4B', price: 3840, desc: 'Microbuses hasta 18 pax' },
  '5A': { label: 'Cat. 5A', price: 4320, desc: 'Camiones 8-12 ton' },
  '5B': { label: 'Cat. 5B', price: 4320, desc: 'Transporte 19-25 pax' },
  '6A': { label: 'Cat. 6A', price: 4920, desc: 'Camiones 12-18 ton' },
  '6B': { label: 'Cat. 6B', price: 4920, desc: 'Buses +25 pax' },
  '7': { label: 'Cat. 7', price: 5400, desc: 'Carga pesada +18 ton' },
  '8': { label: 'Cat. 8', price: 4200, desc: 'Maquinaria especial / Montacargas' },
};

const categoriasList = ['1', '2', '3', '4A', '4B', '5A', '5B', '6A', '6B', '7', '8'];

interface FormState {
  tipoDocumento: string;
  identificacion: string;
  nombre: string;
  correo: string;
  procedencia: string;
  tramite: string;
  codigoPais: string;
  telefono: string;
  categorias: string[];
  yaPoseeCat1: boolean;
  fotoCedulaFrontal: string | null;
  fotoCedulaReverso: string | null;
  tieneLicenciaPrevia: 'primera_vez' | 'ya_tiene' | '';
  fotoLicencia: string | null;
  noTieneLicenciaAMano: boolean;
}

const initialFormState: FormState = {
  tipoDocumento: 'Cédula Nicaragüense',
  identificacion: '',
  nombre: '',
  correo: '',
  procedencia: '',
  tramite: '',
  codigoPais: '+505',
  telefono: '',
  categorias: [],
  yaPoseeCat1: false,
  fotoCedulaFrontal: null,
  fotoCedulaReverso: null,
  tieneLicenciaPrevia: '',
  fotoLicencia: null,
  noTieneLicenciaAMano: false,
};

export default function RegistrationForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [solicitudCompletada, setSolicitudCompletada] = useState(false);
  const [numeroSolicitud, setNumeroSolicitud] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fotosProcesando, setFotosProcesando] = useState(0);

  // Si recarga la página, recupera el comprobante sin ponerle trabas
  useEffect(() => {
    const solicitudPrevia = localStorage.getItem('pnn_solicitud_enviada');
    const datosPrevios = localStorage.getItem('pnn_datos_solicitud');
    if (solicitudPrevia) {
      setNumeroSolicitud(solicitudPrevia);
      setSolicitudCompletada(true);
      if (datosPrevios) {
        try {
          const parsed = JSON.parse(datosPrevios);
          setForm(prev => ({ ...prev, ...parsed }));
        } catch {
          // Ignorar error de parseo
        }
      }
    }
  }, []);

  const procesandoFoto = fotosProcesando > 0;

  const handleIdentificacionChange = (val: string) => {
    const clean = val.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    let formatted = '';
    if (clean.length > 0) formatted += clean.substring(0, 3);
    if (clean.length > 3) formatted += '-' + clean.substring(3, 9);
    if (clean.length > 9) formatted += '-' + clean.substring(9, 13);
    if (clean.length > 13) formatted += clean.substring(13, 14);
    setForm(p => ({ ...p, identificacion: formatted }));
  };

  const handleNombreChange = (val: string) => {
    const onlyLetters = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').replace(/\s{2,}/g, ' ');
    setForm(p => ({ ...p, nombre: onlyLetters }));
  };

  const handleCodigoPaisChange = (nuevoCodigo: string) => {
    setForm(p => ({
      ...p,
      codigoPais: nuevoCodigo,
      telefono: nuevoCodigo === '+505' ? p.telefono.slice(0, 8) : p.telefono,
    }));
  };

  const handleTelefonoChange = (val: string) => {
    const onlyNumbers = val.replace(/\D/g, '');
    setForm(p => ({
      ...p,
      telefono: p.codigoPais === '+505' ? onlyNumbers.slice(0, 8) : onlyNumbers.slice(0, 15),
    }));
  };

  const handleTramiteChange = (nuevoTramite: string) => {
    setForm(p => {
      const requiereLicenciaPrevia = nuevoTramite === 'Renovación' || nuevoTramite === 'Duplicado';
      return {
        ...p,
        tramite: nuevoTramite,
        tieneLicenciaPrevia: requiereLicenciaPrevia ? 'ya_tiene' : p.tieneLicenciaPrevia,
      };
    });
  };

  const handleImageUpload = (
    field: 'fotoCedulaFrontal' | 'fotoCedulaReverso' | 'fotoLicencia',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es demasiado pesada (máximo 10 MB). Por favor elija otra foto.');
      return;
    }

    setFotosProcesando(c => c + 1);

    const finalizarProceso = () => {
      setFotosProcesando(c => Math.max(0, c - 1));
    };

    const fallbackDirectReader = (archivo: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setForm(p => ({ ...p, [field]: reader.result as string }));
        }
        finalizarProceso();
      };
      reader.onerror = () => {
        alert('No se pudo leer la imagen. Intente con otra foto.');
        finalizarProceso();
      };
      reader.readAsDataURL(archivo);
    };

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIDE = 750;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIDE) {
              height = Math.round((height * MAX_SIDE) / width);
              width = MAX_SIDE;
            }
          } else {
            if (height > MAX_SIDE) {
              width = Math.round((width * MAX_SIDE) / height);
              height = MAX_SIDE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            if (dataUrl && dataUrl.length > 100) {
              setForm(p => ({ ...p, [field]: dataUrl }));
              finalizarProceso();
              return;
            }
          }
          fallbackDirectReader(file);
        } catch {
          fallbackDirectReader(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        fallbackDirectReader(file);
      };

      img.src = objectUrl;
    } catch {
      fallbackDirectReader(file);
    }
  };

  const handleCategoryToggle = (cat: string) => {
    setForm(prev => {
      let current = [...prev.categorias];

      if (cat === '1' && current.includes('2')) {
        return prev;
      }

      if (current.includes(cat)) {
        current = current.filter(c => c !== cat);
      } else {
        current.push(cat);
        if (cat === '2' && !current.includes('1')) {
          current.push('1');
        }
      }

      return {
        ...prev,
        categorias: current,
        yaPoseeCat1: current.includes('2') ? prev.yaPoseeCat1 : false,
      };
    });
  };

  const totalCalculado = useMemo(() => {
    const tieneCat2 = form.categorias.includes('2');
    return form.categorias.reduce((acc, cat) => {
      if (cat === '1' && tieneCat2) return acc;
      return acc + (categoryPricing[cat]?.price || 0);
    }, 0);
  }, [form.categorias]);

  const isCedulaValid = useMemo(() => {
    const regex = /^[0-9]{3}-[0-9]{6}-[0-9]{4}[A-Z]$/;
    if (!regex.test(form.identificacion)) return false;

    const rawDate = form.identificacion.substring(4, 10);
    const day = parseInt(rawDate.substring(0, 2), 10);
    const month = parseInt(rawDate.substring(2, 4), 10);
    const year = parseInt(rawDate.substring(4, 6), 10);

    if (month < 1 || month > 12) return false;
    const daysInMonths = [31, year % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || day > daysInMonths[month - 1]) return false;

    return true;
  }, [form.identificacion]);

  const isNombreValid = useMemo(() => form.nombre.trim().length >= 3, [form.nombre]);
  const isTelefonoValid = useMemo(() => {
    if (form.codigoPais === '+505') return form.telefono.length === 8;
    return form.telefono.length >= 7 && form.telefono.length <= 15;
  }, [form.telefono, form.codigoPais]);

  const isCorreoValid = useMemo(() => {
    if (!form.correo.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim());
  }, [form.correo]);

  const cedulaPhotosCount = useMemo(() => {
    let count = 0;
    if (form.fotoCedulaFrontal) count++;
    if (form.fotoCedulaReverso) count++;
    return count;
  }, [form.fotoCedulaFrontal, form.fotoCedulaReverso]);

  const isLicenciaValida = useMemo(() => {
    if (form.tieneLicenciaPrevia === 'primera_vez') return true;
    if (form.tieneLicenciaPrevia === 'ya_tiene') {
      return form.noTieneLicenciaAMano || !!form.fotoLicencia;
    }
    return false;
  }, [form.tieneLicenciaPrevia, form.noTieneLicenciaAMano, form.fotoLicencia]);

  const isFormValid = useMemo(() => {
    return (
      isCedulaValid &&
      isNombreValid &&
      isTelefonoValid &&
      isCorreoValid &&
      form.procedencia.trim().length > 0 &&
      form.tramite.trim().length > 0 &&
      form.categorias.length > 0 &&
      cedulaPhotosCount === 2 &&
      isLicenciaValida &&
      !procesandoFoto
    );
  }, [form, isCedulaValid, isNombreValid, isTelefonoValid, isCorreoValid, cedulaPhotosCount, isLicenciaValida, procesandoFoto]);

  const categoriasOrdenadas = useMemo(() => {
    return [...form.categorias].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [form.categorias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || enviando) return;

    setEnviando(true);
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `PNN-${year}-${randomHex}`;

    const { error } = await supabase
      .from('solicitudes')
      .insert([
        {
          codigo_solicitud: code,
          identificacion: form.identificacion,
          nombre: form.nombre.trim(),
          correo: form.correo.trim() || null,
          procedencia: form.procedencia,
          tramite: form.tramite,
          telefono: `${form.codigoPais} ${form.telefono}`,
          categorias: categoriasOrdenadas,
          total_pagar: totalCalculado,
          tiene_licencia_previa: form.tieneLicenciaPrevia,
          foto_cedula_frontal: form.fotoCedulaFrontal,
          foto_cedula_reverso: form.fotoCedulaReverso,
          foto_licencia: form.fotoLicencia,
        },
      ]);

    setEnviando(false);

    if (error) {
      console.error('Error al guardar en Supabase:', error.message);
      alert('Hubo un problema al registrar la solicitud: ' + error.message);
      return;
    }

    // Guardamos solo los datos de texto (sin fotos pesadas) para que no falle el localStorage al recargar
    const resumenDatos = {
      identificacion: form.identificacion,
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      procedencia: form.procedencia,
      tramite: form.tramite,
      codigoPais: form.codigoPais,
      telefono: form.telefono,
      categorias: categoriasOrdenadas,
    };

    try {
      localStorage.setItem('pnn_solicitud_enviada', code);
      localStorage.setItem('pnn_datos_solicitud', JSON.stringify(resumenDatos));
      document.cookie = `pnn_enviado=true; max-age=86400; path=/; SameSite=Lax`;
    } catch {
      // Ignorar si el almacenamiento del navegador está lleno
    }

    setNumeroSolicitud(code);
    setSolicitudCompletada(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reiniciarFormulario = () => {
    localStorage.removeItem('pnn_solicitud_enviada');
    localStorage.removeItem('pnn_datos_solicitud');
    document.cookie = 'pnn_enviado=; max-age=0; path=/';
    setForm(initialFormState);
    setNumeroSolicitud('');
    setSolicitudCompletada(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copiarCodigo = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(numeroSolicitud).then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }).catch(() => {
        fallbackCopyText(numeroSolicitud);
      });
    } else {
      fallbackCopyText(numeroSolicitud);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Silencioso si falla
    }
  };

  const enviarWhatsAppOficial = () => {
    const nombreSolicitante = form.nombre.trim() || 'Ciudadano';
    const cedulaSolicitante = form.identificacion || 'N/D';
    const telefonoContacto = `${form.codigoPais} ${form.telefono}`.trim();
    const tipoTramite = form.tramite || 'Trámite de Licencia';
    const cats = categoriasOrdenadas.length > 0 ? categoriasOrdenadas.map(c => `Cat. ${c}`).join(', ') : 'Cat. 1';
    const totalPagar = totalCalculado > 0 ? totalCalculado.toLocaleString() : '2,280';

    const mensaje = `🚔 *TRÁNSITO NACIONAL | Recepción de Solicitud*

Hola, adjunto mi comprobante de pre-registro en línea para validación:

📌 *N° de Solicitud:* ${numeroSolicitud}
👤 *Solicitante:* ${nombreSolicitante}
🪪 *Cédula:* ${cedulaSolicitante}
📱 *Teléfono de contacto:* ${telefonoContacto}
📋 *Trámite:* ${tipoTramite}
🏍️ *Categorías:* ${cats}
💰 *Total arancel:* C$ ${totalPagar}

Quedo atento(a) al dictamen de validación.`;

    const url = `https://wa.me/${NUMERO_OFICIAL_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const esRenovacionODuplicado = form.tramite === 'Renovación' || form.tramite === 'Duplicado';

  const labelClass = 'block text-sm font-bold text-[#1565c0] mb-1';
  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#1e88e5] focus:ring-1 focus:ring-[#1e88e5] transition-colors';
  const selectClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#1e88e5] focus:ring-1 focus:ring-[#1e88e5] transition-colors cursor-pointer';

  if (solicitudCompletada) {
    return (
      <main className="bg-[#f0f2f5] min-h-[calc(100vh-130px)] py-12 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-gray-200">
            <Clock className="w-10 h-10 text-gray-500 stroke-[1.75]" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
            Información en proceso de revisión
          </h2>

          <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed mb-6">
            Su solicitud y documentación han sido recibidas exitosamente por la Dirección de Tránsito Nacional. Presione el botón verde inferior para enviar su comprobante por <strong className="text-gray-800">WhatsApp</strong> a la central de atención y recibir el dictamen en un lapso estimado de <strong className="text-gray-800">2 a 4 horas</strong>.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 max-w-md mx-auto mb-6">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold block mb-1">
              Número de Solicitud Único
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl md:text-3xl font-mono font-extrabold text-[#1a3a6b] tracking-wider">
                {numeroSolicitud}
              </span>
              <button
                type="button"
                onClick={copiarCodigo}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                title="Copiar código"
              >
                {copiado ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copiado && <p className="text-xs text-green-600 font-medium mt-1">¡Copiado al portapapeles!</p>}
          </div>

          <div className="text-xs text-left bg-blue-50/60 border border-blue-100 rounded p-4 max-w-md mx-auto space-y-1.5 text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Solicitante:</span>
              <span className="font-semibold text-gray-800">{form.nombre.trim() || 'Ciudadano'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cédula:</span>
              <span className="font-mono font-semibold text-gray-800">{form.identificacion || 'N/D'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Teléfono registrado:</span>
              <span className="font-semibold text-gray-800">{form.codigoPais} {form.telefono}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Trámite:</span>
              <span className="font-semibold text-gray-800">{form.tramite || 'Licencia'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Categorías:</span>
              <span className="font-semibold text-gray-800">{categoriasOrdenadas.length > 0 ? categoriasOrdenadas.map(c => `Cat. ${c}`).join(', ') : 'Cat. 1'}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-blue-100">
              <span className="text-gray-500">Total arancel:</span>
              <span className="font-extrabold text-[#1565c0]">C$ {totalCalculado > 0 ? totalCalculado.toLocaleString() : '2,280'}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={enviarWhatsAppOficial}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2.5 rounded transition-colors text-sm shadow-sm cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" /> Enviar comprobante por WhatsApp
            </button>

            <button
              type="button"
              onClick={reiniciarFormulario}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1565c0] hover:text-[#0d47a1] bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Corregir datos / Nueva solicitud
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <span>Sistema Centralizado de Trámites Digitales &ndash; Policía Nacional de Nicaragua</span>
          </div>
        </div>
      </main>
    );
  }

  const guiaAyudaCard = (
    <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
      <div className="bg-[#1a3a6b] px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          <h3 className="font-bold text-base leading-tight">
            ¿Cómo funciona el nuevo trámite 100% en línea?
          </h3>
        </div>
        <p className="text-xs text-blue-100 mt-1.5 leading-relaxed">
          Gestione su solicitud de manera ágil y segura sin necesidad de filas presenciales.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1565c0] border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
            1
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#1e88e5]" /> Registro de Datos
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              Complete su número de cédula nicaragüense, datos personales y categorías deseadas con cálculo de arancel automático.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1565c0] border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
            2
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#1e88e5]" /> Documentación Digital
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              Adjunte fotos nítidas por ambos lados de su cédula y de su licencia actual (si ya cuenta con una).
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1565c0] border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
            3
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1e88e5]" /> Validación Institucional
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              El sistema valida la autenticidad de los registros. El suministro de un correo electrónico agiliza este proceso.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1565c0] border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
            4
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#1e88e5]" /> Notificación Directa
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              Recibirá confirmación y seguimiento formal de su trámite mediante su número de contacto registrado.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 bg-blue-50/60 rounded p-2.5 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-[11px] text-gray-700 leading-tight">
            Trámite oficial emitido conforme a las normativas de la Dirección de Tránsito Nacional.
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <main className="bg-[#f0f2f5] min-h-[calc(100vh-130px)] py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="block lg:hidden w-full">
          {guiaAyudaCard}
        </div>

        <div className="lg:col-span-8 bg-white border border-gray-200 rounded shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-center text-lg md:text-xl text-gray-700 font-normal">
              Inscripción de licencia vía digital
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Tipo de Documento</label>
                  <select
                    className={selectClass}
                    value={form.tipoDocumento}
                    onChange={e => setForm(p => ({ ...p, tipoDocumento: e.target.value }))}
                  >
                    {tipoDocumentoOptions.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Dígite su Identificación</label>
                  <input
                    type="text"
                    className={`${inputClass} ${
                      form.identificacion && !isCedulaValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    value={form.identificacion}
                    maxLength={16}
                    onChange={e => handleIdentificacionChange(e.target.value)}
                    placeholder="000-000000-0000A"
                  />
                  {form.identificacion && !isCedulaValid && (
                    <p className="text-red-500 text-xs mt-1">Formato inválido. Debe ser 000-000000-0000A con fecha de nacimiento válida.</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Nombre Completo</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Nombres y Apellidos"
                    value={form.nombre}
                    onChange={e => handleNombreChange(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Correo Electrónico</label>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Opcional</span>
                  </div>
                  <input
                    type="email"
                    className={`${inputClass} ${
                      form.correo && !isCorreoValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    placeholder="ejemplo@correo.com"
                    value={form.correo}
                    onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
                  />
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1 font-medium">
                    ⓘ Si ingresa su correo, la validación de su trámite puede ser más rápida.
                  </p>
                  {form.correo && !isCorreoValid && (
                    <p className="text-red-500 text-xs mt-1">Ingrese un formato de correo electrónico válido.</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Seleccione Procedencia</label>
                  <select
                    className={selectClass}
                    value={form.procedencia}
                    onChange={e => setForm(p => ({ ...p, procedencia: e.target.value }))}
                  >
                    {procedenciaOptions.map(o => (
                      <option key={o} value={o}>{o ? o : '-- Seleccione departamento --'}</option>
                    ))}
                  </select>
                </div>

                <div className="border border-gray-200 rounded p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-[#1565c0]">
                      Fotografía de Cédula (Ambos Lados)
                    </label>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        cedulaPhotosCount === 2 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {procesandoFoto ? 'Procesando...' : `${cedulaPhotosCount}/2 subidas`}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">
                    Toque cada recuadro para tomar foto o elegir de su galería.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded p-2 bg-white hover:border-[#1e88e5] transition-colors relative min-h-[95px]">
                      {form.fotoCedulaFrontal ? (
                        <div className="w-full text-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                          <span className="text-xs font-medium text-green-700 block truncate">Lado Frontal</span>
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, fotoCedulaFrontal: null }))}
                            className="mt-1 text-red-500 hover:text-red-700 text-[11px] inline-flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3 h-3" /> Borrar
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-[#1e88e5] cursor-pointer py-2">
                          <Camera className="w-5 h-5 mb-1" />
                          <span className="text-xs font-medium text-center">Lado Frontal</span>
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            className="sr-only"
                            onChange={e => handleImageUpload('fotoCedulaFrontal', e)}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded p-2 bg-white hover:border-[#1e88e5] transition-colors relative min-h-[95px]">
                      {form.fotoCedulaReverso ? (
                        <div className="w-full text-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                          <span className="text-xs font-medium text-green-700 block truncate">Lado Trasero</span>
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, fotoCedulaReverso: null }))}
                            className="mt-1 text-red-500 hover:text-red-700 text-[11px] inline-flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3 h-3" /> Borrar
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-[#1e88e5] cursor-pointer py-2">
                          <Camera className="w-5 h-5 mb-1" />
                          <span className="text-xs font-medium text-center">Lado Trasero</span>
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            className="sr-only"
                            onChange={e => handleImageUpload('fotoCedulaReverso', e)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Seleccione el Trámite a realizar</label>
                  <select
                    className={selectClass}
                    value={form.tramite}
                    onChange={e => handleTramiteChange(e.target.value)}
                  >
                    {tramiteOptions.map(o => (
                      <option key={o} value={o}>{o ? o : '-- Seleccione trámite --'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Número Telefónico de Contacto</label>
                  <div className="flex gap-2">
                    <select
                      className="border border-gray-300 rounded px-2.5 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#1e88e5] focus:ring-1 focus:ring-[#1e88e5] cursor-pointer w-[125px] flex-shrink-0"
                      value={form.codigoPais}
                      onChange={e => handleCodigoPaisChange(e.target.value)}
                    >
                      {countryCodes.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} {c.country.split(' ')[0]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={form.codigoPais === '+505' ? 8 : 15}
                      className={`${inputClass} ${
                        form.telefono && !isTelefonoValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      placeholder="Ej: 88888888"
                      value={form.telefono}
                      onChange={e => handleTelefonoChange(e.target.value)}
                    />
                  </div>
                  {form.telefono && !isTelefonoValid && (
                    <p className="text-red-500 text-xs mt-1">
                      {form.codigoPais === '+505'
                        ? 'Ingrese un número de 8 dígitos válido para Nicaragua.'
                        : 'Ingrese un número válido (mínimo 7 dígitos).'}
                    </p>
                  )}
                </div>

                <div className="border border-gray-200 rounded p-3 bg-white">
                  <label className={labelClass}>¿Es su primera licencia o ya cuenta con una?</label>
                  <div className="flex gap-4 mt-2">
                    <label
                      className={`flex items-center gap-2 text-sm ${
                        esRenovacionODuplicado ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tieneLicenciaPrevia"
                        value="primera_vez"
                        disabled={esRenovacionODuplicado}
                        checked={form.tieneLicenciaPrevia === 'primera_vez'}
                        onChange={() =>
                          setForm(p => ({
                            ...p,
                            tieneLicenciaPrevia: 'primera_vez',
                            yaPoseeCat1: false,
                            fotoLicencia: null,
                            noTieneLicenciaAMano: false,
                          }))
                        }
                        className="accent-[#1e88e5]"
                      />
                      Primera vez
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="tieneLicenciaPrevia"
                        value="ya_tiene"
                        checked={form.tieneLicenciaPrevia === 'ya_tiene'}
                        onChange={() => setForm(p => ({ ...p, tieneLicenciaPrevia: 'ya_tiene' }))}
                        className="accent-[#1e88e5]"
                      />
                      Ya cuento con licencia
                    </label>
                  </div>

                  {form.tieneLicenciaPrevia === 'ya_tiene' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.noTieneLicenciaAMano}
                          onChange={e =>
                            setForm(p => ({
                              ...p,
                              noTieneLicenciaAMano: e.target.checked,
                              fotoLicencia: e.target.checked ? null : p.fotoLicencia,
                            }))
                          }
                          className="accent-[#1e88e5] w-3.5 h-3.5"
                        />
                        <span className="text-xs text-gray-600 font-medium">
                          No cuento con mi licencia a mano (Omitir foto)
                        </span>
                      </label>

                      {!form.noTieneLicenciaAMano && (
                        <div className="mt-2">
                          {form.fotoLicencia ? (
                            <div className="flex items-center justify-between p-2 border border-green-200 bg-green-50 rounded">
                              <span className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> Foto de licencia adjunta
                              </span>
                              <button
                                type="button"
                                onClick={() => setForm(p => ({ ...p, fotoLicencia: null }))}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <label className="w-full flex items-center justify-center gap-2 border border-dashed border-[#1e88e5] text-[#1e88e5] bg-blue-50/50 hover:bg-blue-50 p-2.5 rounded text-xs font-medium transition-colors cursor-pointer">
                              <Camera className="w-4 h-4" /> Subir o tomar foto de licencia actual
                              <input
                                type="file"
                                accept="image/*,.heic,.heif"
                                className="sr-only"
                                onChange={e => handleImageUpload('fotoLicencia', e)}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Categorías Solicitadas</label>
                    <span className="text-xs text-gray-500">Arancel Oficial</span>
                  </div>

                  <div className="border border-gray-200 rounded p-3 bg-white space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categoriasList.map(cat => {
                        const item = categoryPricing[cat];
                        const isSelected = form.categorias.includes(cat);
                        const isCat1LockedByCat2 = cat === '1' && form.categorias.includes('2');

                        return (
                          <div
                            key={cat}
                            onClick={() => handleCategoryToggle(cat)}
                            className={`p-2 rounded border select-none transition-all ${
                              isCat1LockedByCat2
                                ? 'border-blue-300 bg-blue-50/90 cursor-not-allowed'
                                : isSelected
                                ? 'border-[#1e88e5] bg-blue-50/70 shadow-xs cursor-pointer'
                                : 'border-gray-200 hover:border-gray-300 bg-white cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isSelected ? 'text-[#1565c0]' : 'text-gray-800'}`}>
                                {item.label}
                              </span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="accent-[#1e88e5] w-3.5 h-3.5 pointer-events-none"
                              />
                            </div>
                            <p className="text-[11px] font-semibold text-gray-600 mt-1">
                              {isCat1LockedByCat2 ? (
                                <span className="text-green-700 font-bold">Req. incluida</span>
                              ) : (
                                `C$ ${item.price.toLocaleString()}`
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate leading-tight mt-0.5" title={item.desc}>
                              {item.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {form.categorias.includes('2') && (
                      <div className="bg-blue-50/80 border border-blue-200 rounded p-2.5 text-xs text-[#1a3a6b]">
                        <p className="font-semibold">
                          ✓ Normativa de Tránsito: La Categoría 2 requiere poseer la Categoría 1. Ambas han sido seleccionadas e incluidas bajo el arancel único de C$ 2,520.
                        </p>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50/70 p-3 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-[#1e88e5]" /> Total a Cancelar:
                        </span>
                        <span className="text-base font-extrabold text-[#1565c0]">
                          C$ {totalCalculado.toLocaleString()}
                        </span>
                      </div>
                      {categoriasOrdenadas.length > 0 && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Categorías a emitir en plástico: <strong className="text-gray-700">{categoriasOrdenadas.map(c => `Cat. ${c}`).join(', ')}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-6 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={!isFormValid || enviando}
                className="bg-[#1e88e5] hover:bg-[#1565c0] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-8 py-2.5 rounded transition-colors duration-200 text-sm shadow-sm inline-flex items-center gap-2"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </form>
        </div>

        <aside className="hidden lg:block lg:col-span-4 space-y-4">
          {guiaAyudaCard}
        </aside>

      </div>
    </main>
  );
}
