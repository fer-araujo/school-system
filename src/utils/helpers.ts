// src/utils/ui-helpers.ts

/**
 * Genera clases de Tailwind consistentes (fondo, texto, borde)
 * basándose en el nombre del usuario (Hashing string).
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-yellow-100 text-yellow-700 border-yellow-200",
    "bg-pink-100 text-pink-700 border-pink-200",
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
  ];

  if (!name) return colors[0]; // Fallback de seguridad

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Math.abs para evitar índices negativos
  return colors[Math.abs(hash) % colors.length];
};

// Función auxiliar pura (Puede ir al final del archivo o en un utils)
export const handleShareCredentials = (
  method: "whatsapp" | "email",
  data: {
    fullName: string;
    email: string;
    tempPass: string;
    empNo: string;
    phone: string;
  },
) => {
  const msg = `Hola ${data.fullName}, bienvenida.\nAcceso: ${data.email}\nPass Temporal: ${data.tempPass}\nNo. Emp: ${data.empNo}\n(El sistema te pedirá cambiar tu contraseña al entrar).`;
  const encoded = encodeURIComponent(msg);

  if (method === "whatsapp")
    window.open(`https://wa.me/${data.phone}?text=${encoded}`, "_blank");
  if (method === "email")
    window.open(
      `mailto:${data.email}?subject=Accesos&body=${encoded}`,
      "_blank",
    );
};
