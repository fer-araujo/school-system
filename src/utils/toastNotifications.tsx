import { toast } from "react-hot-toast";
import { MessageCircle, Mail } from "lucide-react";
import { getAvatarColor, handleShareCredentials } from "./helpers"; // Asumiendo que están ahí

export interface RegistrationData {
  uid: string;
  empNo: string;
  tempPass: string;
  email: string;
  phone: string;
  fullName: string;
}

export const showRegistrationToast = (newEmployeeData: RegistrationData) => {
  toast.custom(
    (t) => {
      const colorClass = getAvatarColor(newEmployeeData.fullName);

      return (
        <div
          className={`${t.visible ? "animate-in slide-in-from-top-4 fade-in" : "animate-out slide-out-to-top-4 fade-out"} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black/5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="shrink-0 pt-0.5">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white/50 ${colorClass}`}
                >
                  {newEmployeeData.fullName.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {newEmployeeData.fullName}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Cuenta creada. Envía las credenciales:
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      handleShareCredentials("whatsapp", newEmployeeData);
                      toast.dismiss(t.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white text-[11px] font-bold rounded-md hover:bg-[#20bd5a] transition-colors shadow-sm"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      handleShareCredentials("email", newEmployeeData);
                      toast.dismiss(t.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded-md hover:bg-slate-900 transition-colors shadow-sm"
                  >
                    <Mail size={14} /> Correo
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-100">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      );
    },
    { duration: Infinity },
  );
};
