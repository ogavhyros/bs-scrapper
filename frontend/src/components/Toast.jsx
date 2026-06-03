import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return { toasts, showToast };
}

const STYLES = {
  success: { bg: '#42D674', text: '#ffffff', border: '#2ab55d', Icon: CheckCircle2 },
  error:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', Icon: XCircle      },
  info:    { bg: '#80EF80', text: '#1a5e2a', border: '#42D674', Icon: Info         },
};

export function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const s = STYLES[t.type] ?? STYLES.info;
        const { Icon } = s;
        return (
          <div
            key={t.id}
            className="flex items-center gap-2.5 px-4 py-3 rounded-card text-sm font-medium border shadow-lg min-w-[220px] pointer-events-auto"
            style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
          >
            <Icon size={15} className="flex-shrink-0" />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
