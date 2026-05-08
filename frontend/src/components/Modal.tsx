import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose?: () => void;
  preventBackdropClose?: boolean;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, preventBackdropClose, children, maxWidth = 'max-w-lg' }: Props) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        style={preventBackdropClose ? { pointerEvents: 'none' } : undefined}
        onClick={preventBackdropClose ? undefined : onClose}
      />
      <div className={`relative z-10 bg-white rounded-xl shadow-2xl w-full mx-4 ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
