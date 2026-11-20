export default function Header() {
  return (
    <header className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
        
        {/* Logo Policía */}
        <div className="flex items-center flex-shrink-0">
          <img 
            src="/logo-policia.jpg" 
            alt="Policía Nacional de Nicaragua" 
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Título */}
        <div className="flex-1 text-center px-4">
          <h1 className="text-[#1a3a6b] text-xl md:text-2xl font-bold tracking-wide">
            Policía Nacional de Nicaragua &ndash; Trámites en Línea
          </h1>
        </div>

        {/* Logo Gobierno */}
        <div className="flex-shrink-0 hidden md:flex items-center">
          <img 
            src="/logo-gobierno.png" 
            alt="Gobierno de Reconciliación y Unidad Nacional" 
            className="h-14 w-auto object-contain"
          />
        </div>

      </div>
      {/* Barra de color institucional inferior */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0a1628] via-[#1a3a6b] to-[#1e88e5]"></div>
    </header>
  );
}
