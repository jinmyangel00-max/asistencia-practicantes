import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface FeedbackToastProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

export function FeedbackToast({ type, title, message, onClose }: FeedbackToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className={`fixed bottom-5 right-5 z-[70] flex w-[min(24rem,calc(100vw-2.5rem))] items-start gap-3 rounded-2xl border p-4 text-white shadow-2xl ${isSuccess ? 'border-emerald-300/30 bg-emerald-700' : 'border-red-300/30 bg-red-700'}`}
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
    >
      <motion.span
        initial={{ scale: 0, rotate: -35 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.12, type: 'spring', stiffness: 420, damping: 16 }}
        className="mt-0.5 shrink-0"
      >
        <Icon className="h-6 w-6" />
      </motion.span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-sm text-white/90">{message}</p>
      </div>
      <button type="button" onClick={onClose} className="-mr-1 -mt-1 rounded-lg p-1.5 transition hover:bg-white/15" aria-label="Cerrar aviso">
        <X className="h-4 w-4" />
      </button>
      <motion.span
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
        className="absolute bottom-0 left-0 h-1 w-full origin-left rounded-full bg-white/70"
        aria-hidden="true"
      />
    </motion.div>
  );
}
