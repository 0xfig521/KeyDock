import { LockIcon } from "lucide-react"
import type { FormEvent } from "react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/useToast"
import type { UseVault } from "@/hooks/useVault"
import { cn } from "@/lib/utils"

interface LockScreenProps {
  vault: UseVault
}

/**
 * Master-password gate. Either initializes a fresh vault or unlocks an
 * existing one depending on `vault.initialized`. Uses a single
 * `vault.submit(password)` action — the hook decides which Tauri command
 * to call.
 *
 * Receives `vault` from App as a prop so the unlock state lives in a
 * single hook instance; otherwise the LockScreen would hold its own
 * `useVault()` whose `ready` flag never reaches the App-level gate and
 * the UI would stay on the lock screen after a successful unlock.
 */
export function LockScreen({ vault }: LockScreenProps) {
  const { toast } = useToast()
  const [password, setPassword] = useState("")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (vault.submitting) return
    await vault.submit(password)
    setPassword("")
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background text-foreground font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />

      <div className="w-full max-w-sm px-6 py-12 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            keydock<span className="text-emerald-500">.</span>
          </span>
          <Badge
            variant="outline"
            className="text-emerald-500/80 border-emerald-500/20 text-[10px] uppercase font-mono py-0 px-1.5 h-4"
          >
            Local Vault
          </Badge>
        </div>

        <Card className="w-full border-border bg-card/60 backdrop-blur-md shadow-2xl shadow-emerald-950/20">
          <CardHeader className="text-center pb-4 pt-6 px-6 gap-2.5">
            <CardTitle className="text-lg font-semibold tracking-tight">
              {vault.initialized ? "Unlock Insurance Vault" : "Create Master Vault"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed px-2">
              {vault.initialized
                ? "Enter master password to unlock your secure key database."
                : "Setup a strong master password to derive secure encryption keys."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-6 py-2">
              <div className="space-y-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  autoFocus
                  required
                  className="h-10 text-center tracking-widest text-sm bg-background/50 border-zinc-800"
                />
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-4 border-t border-zinc-900 bg-muted/20">
              <Button
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-md shadow-lg shadow-emerald-900/30"
                type="submit"
                disabled={vault.submitting}
              >
                <LockIcon className="size-3.5 mr-2" />
                {vault.initialized ? "Unlock Vault" : "Initialize Vault"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {toast && (
          <div
            className={cn(
              "mt-4 p-3 rounded-lg border text-xs max-w-full text-center animate-in fade-in slide-in-from-bottom-2",
              toast.type === "error"
                ? "bg-destructive/15 border-destructive/20 text-destructive-foreground"
                : "bg-muted/80 border-border text-muted-foreground",
            )}
          >
            {toast.message}
          </div>
        )}
      </div>
    </main>
  )
}
