"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto animate-toast-in"
            onClick={() => dismiss(t.id)}
          >
            <div
              className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer backdrop-blur-sm ${
                t.type === "success"
                  ? "bg-green-500/90 text-white"
                  : t.type === "error"
                    ? "bg-red-500/90 text-white"
                    : "bg-card/95 text-foreground border border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>
                  {t.type === "success"
                    ? "✓"
                    : t.type === "error"
                      ? "✕"
                      : "ℹ"}
                </span>
                {t.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
