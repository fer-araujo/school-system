import { useState } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../context/AuthContext';
import { QRPayloadBuilder } from '../../domain/logic/QRPayloadBuilder';

export default function Dashboard() {
  const { user } = useAuth();
  const [scanType, setScanType] = useState<'ENTRY' | 'EXIT'>('ENTRY');

  if (!user) return null;

  // Generamos el valor dinámico del QR usando nuestra capa de Dominio
  const qrValue = QRPayloadBuilder.buildDailyPayload(user, scanType);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Panel de Asistencia</h1>
      
      {/* TARJETA FUNCIONAL DEL QR (Cero diseño final, 100% funcional) */}
      <div className="border-2 border-slate-300 p-6 max-w-sm rounded-lg bg-white flex flex-col items-center gap-6">
        <h2 className="text-xl font-semibold text-center">
          Tu QR de hoy
        </h2>
        
        {/* Selector de Entrada / Salida */}
        <div className="flex gap-2 w-full">
          <button 
            onClick={() => setScanType('ENTRY')}
            className={`flex-1 py-2 font-bold ${scanType === 'ENTRY' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
          >
            ENTRADA
          </button>
          <button 
            onClick={() => setScanType('EXIT')}
            className={`flex-1 py-2 font-bold ${scanType === 'EXIT' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
          >
            SALIDA
          </button>
        </div>

        {/* El componente que dibuja el QR */}
        <div className="bg-white p-4 border-4 border-dashed border-gray-200">
          <QRCode 
            value={qrValue} 
            size={256}
            level="H" // Alta redundancia para que se lea fácil aunque la pantalla brille
          />
        </div>

        <p className="text-sm text-gray-500 text-center">
          Muestra este código en el escáner de la escuela.<br/>
          <strong>Nota:</strong> Este código solo es válido por el día de hoy.
        </p>

        {/* SOLO PARA DEBUG: Ver qué datos tiene el QR internamente */}
        <pre className="text-xs bg-gray-100 p-2 w-full overflow-x-auto text-gray-400">
          Payload: {qrValue}
        </pre>
      </div>
    </div>
  );
}