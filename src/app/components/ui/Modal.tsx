import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom"; // 1. IMPORTAMOS createPortal

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-100 flex justify-center items-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 flex items-center justify-between bg-white">
          <h3 className="text-lg font-semibold text-slate-800 tracking-tight">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* El children (el formulario) va aquí adentro */}
        <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
