import { createRoot } from "react-dom/client"
import { ToastProvider } from "@/hooks/useToast"
import { App } from "@/App"
import "./styles.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <ToastProvider>
    <App />
  </ToastProvider>,
)
