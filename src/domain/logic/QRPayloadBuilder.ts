import type { User } from "../models/User";

export interface QRPayload {
  uid: string; // Mantenemos el UID para la velocidad de Firebase
  emp?: string; // Opcional, por si lo quieres mostrar después
  date: string;
  type: 'ENTRY' | 'EXIT';
  t: number; // El timestamp anti-trampas
}

export class QRPayloadBuilder {
  static buildDailyPayload(user: User, type: 'ENTRY' | 'EXIT'): string {
    const payload: QRPayload = {
      uid: user.id,
      emp: user.employeeNumber,
      date: new Date().toLocaleDateString('en-CA'),
      type,
      t: Date.now() // Hora exacta en milisegundos
    };
    return JSON.stringify(payload);
  }
}