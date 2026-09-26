"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import Modal from "./modal";
type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
};
const Context = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (message: string) => void;
} | null>(null);
export function useUI() {
  const value = useContext(Context);
  if (!value) throw new Error("UI provider missing");
  return value;
}
export default function UIProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null);
  const resolve = useRef<((value: boolean) => void) | null>(null);
  const [toast, setToast] = useState("");
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((done) => {
        resolve.current?.(false);
        resolve.current = done;
        setConfirmation(options);
      }),
    [],
  );
  const notify = useCallback((message: string) => setToast(message), []);
  function close(value: boolean) {
    resolve.current?.(value);
    resolve.current = null;
    setConfirmation(null);
  }
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => () => resolve.current?.(false), []);
  return (
    <Context.Provider value={{ confirm, notify }}>
      {children}
      {confirmation && (
        <Modal
          title={confirmation.title}
          onClose={() => close(false)}
          className="confirm-modal"
        >
          <div
            className={`confirm-icon ${confirmation.danger ? "danger" : ""}`}
          >
            <AlertCircle size={25} />
          </div>
          <p className="confirm-description">{confirmation.description}</p>
          <div className="form-actions">
            <button
              type="button"
              className="button"
              data-initial-focus
              onClick={() => close(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`button ${confirmation.danger ? "danger-solid" : "primary"}`}
              onClick={() => close(true)}
            >
              {confirmation.confirmLabel || "Continue"}
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
