"use client";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
function subscribe(callback: () => void) {
  window.addEventListener("yw-theme-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("yw-theme-change", callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem("yw-theme") || "system";
  } catch {
    return "system";
  }
}
export default function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "system");
  return (
    <div className="theme-switcher" role="group" aria-label="Color theme">
      {[
        { id: "light", Icon: Sun, label: "Light mode" },
        { id: "dark", Icon: Moon, label: "Dark mode" },
        { id: "system", Icon: Monitor, label: "System theme" },
      ].map(({ id, Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={theme === id}
          onClick={() => {
            try {
              localStorage.setItem("yw-theme", id);
            } catch {}
            document.documentElement.dataset.theme =
              id === "system"
                ? matchMedia("(prefers-color-scheme: dark)").matches
                  ? "dark"
                  : "light"
                : id;
            window.dispatchEvent(new Event("yw-theme-change"));
          }}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
