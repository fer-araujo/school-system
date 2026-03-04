import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import Modal from "./Modal"; // Asumiendo que tu Modal genérico está en esta misma carpeta

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  isDanger?: boolean;
  isProcessing?: boolean;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "Confirmar",
  isDanger = false,
  isProcessing = false,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-2">
        <div className="mb-4 text-slate-600 text-sm">{message}</div>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isDanger ? (
              <AlertTriangle size={16} />
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
