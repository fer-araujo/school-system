import type { User } from "../models/User";

// Definimos qué datos viajarán ocultos dentro del cuadrito del QR
export interface QRPayload {
  uid: string;
  date: string; // Formato YYYY-MM-DD
  type: 'ENTRY' | 'EXIT';
}

export class QRPayloadBuilder {
  /**
   * Genera el texto que irá dentro del QR basado en el día actual.
   * Al incluir la fecha, garantizamos que el QR cambie a la medianoche.
   */
  static buildDailyPayload(user: User, type: 'ENTRY' | 'EXIT'): string {
    // Obtenemos la fecha actual en formato local (México)
    const today = new Date();
    // Ajustamos al formato YYYY-MM-DD
    const dateString = today.toLocaleDateString('en-CA'); // 'en-CA' siempre da YYYY-MM-DD

    const payload: QRPayload = {
      uid: user.id,
      date: dateString,
      type: type
    };

    // Convertimos el objeto a un string (JSON) para meterlo en el QR
    // En el futuro, aquí podríamos agregar una firma criptográfica para evitar falsificaciones
    return JSON.stringify(payload);
  }
}