import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "info", onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColor = type === "success" ? "bg-green-600" : 
                  type === "error" ? "bg-red-600" : "bg-blue-600";
  
  const icon = type === "success" ? "✓" : 
               type === "error" ? "✗" : "ℹ";

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-2xl max-w-md flex items-start gap-3`}>
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium whitespace-pre-wrap">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
