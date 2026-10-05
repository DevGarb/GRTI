import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Após um deploy novo, os chunks da versão anterior podem não existir mais no
// servidor e a próxima rota falha ao carregar para quem estava com a aba aberta.
// Recarrega uma vez para buscar a versão atual (a trava de 10s evita loop).
window.addEventListener("vite:preloadError", (event) => {
  try {
    const key = "chunk-reload-at";
    if (Date.now() - Number(sessionStorage.getItem(key) || 0) < 10_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // sem sessionStorage não há trava contra loop: deixa o erro cair no
    // RouteBoundary, que oferece o botão de recarregar
    return;
  }
  event.preventDefault();
  window.location.reload();
});

// Apply persisted dark mode before render to avoid flash
if (localStorage.getItem("dark-mode") === "true") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
