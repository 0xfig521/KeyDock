import { createRoot } from "react-dom/client"
import { ToastProvider } from "@/hooks/useToast"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"
import { ThemeProvider } from "@/hooks/useTheme"
import { App } from "@/App"
import "@/i18n/config"
import "./styles.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <ThemeProvider>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </ThemeProvider>,
)
