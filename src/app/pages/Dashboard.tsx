import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../context/AuthContext';
import { QRPayloadBuilder } from '../../domain/logic/QRPayloadBuilder';
import { LogIn, LogOut, Clock, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [scanType, setScanType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  
  // Reloj en vivo para la UI
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  // Generamos el valor dinámico del QR usando nuestra capa de Dominio intacta
  const qrValue = QRPayloadBuilder.buildDailyPayload(user, scanType);

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-300">
      
      {/* TARJETA DE IDENTIFICACIÓN */}
      <div className="bg-white w-full rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Encabezado */}
        <div className="bg-slate-800 p-6 text-center text-white">
          <h2 className="text-xl font-bold">{user.fullName}</h2>
          <p className="text-slate-400 text-sm mt-1">{user.email}</p>
          <div className="flex items-center justify-center gap-2 mt-4 text-school-primary font-mono bg-slate-900/50 py-2 rounded-lg">
            <Clock className="w-4 h-4" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Selector de Tipo (Entrada / Salida) */}
        <div className="p-6">
          <div className="flex bg-slate-100 p-1 rounded-lg mb-8">
            <button
              onClick={() => setScanType('ENTRY')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold transition-all ${scanType === 'ENTRY' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LogIn className="w-5 h-5" /> ENTRADA
            </button>
            <button
              onClick={() => setScanType('EXIT')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold transition-all ${scanType === 'EXIT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LogOut className="w-5 h-5" /> SALIDA
            </button>
          </div>

          {/* EL CÓDIGO QR */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-slate-100">
              <QRCode 
                value={qrValue} 
                size={220}
                level="H" // Alta redundancia mantenida como pediste
              />
            </div>
            
            <p className="text-center text-slate-500 text-sm mt-6 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Válido para el {new Date().toLocaleDateString('es-MX')}
            </p>

            {/* DEBUG OCULTO EN PRODUCCIÓN (Solo visible en dev) */}
            {import.meta.env.DEV && (
              <pre className="mt-4 text-[10px] bg-slate-100 p-2 w-full overflow-x-auto text-slate-500 rounded">
                Payload: {qrValue}
              </pre>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}