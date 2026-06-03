import { useRef } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import type { FormEvent } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/useToast"
import type { UseVault } from "@/hooks/useVault"
import { cn } from "@/lib/utils"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

gsap.registerPlugin(useGSAP)

interface LockScreenProps {
  vault: UseVault
}

export function LockScreen({ vault }: LockScreenProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const blobsRef = useRef<(HTMLDivElement | null)[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const setBlobRef = (i: number) => (el: HTMLDivElement | null) => {
    blobsRef.current[i] = el
  }

  useGSAP(() => {
    // Ambient blobs — each with unique drift + breathing
    const blobAnimations = [
      { y: -48, scale: 1.12, dur: 7, sDur: 5 },   // emerald top-left
      { y: 48, scale: 1.1, dur: 9, sDur: 6.5 },    // primary bottom-right
      { y: -28, x: 24, scale: 1.15, dur: 11, sDur: 4.5 }, // amber top-right
      { y: 32, x: -20, scale: 1.08, dur: 8, sDur: 7 },    // violet bottom-left
    ]

    blobsRef.current.forEach((blob, i) => {
      if (!blob) return
      const anim = blobAnimations[i]
      const vars: gsap.TweenVars = {
        y: anim.y,
        duration: anim.dur,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      }
      if (anim.x) (vars as { x?: number }).x = anim.x
      gsap.to(blob, vars)

      // Breathing scale
      gsap.to(blob, {
        scale: anim.scale,
        duration: anim.sDur,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      })
    })

    // Entrance — content fades in and slides up
    gsap.from(contentRef.current, {
      opacity: 0,
      y: 24,
      duration: 0.9,
      ease: "power3.out",
    })
  }, { scope: containerRef })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (vault.submitting) return
    if (!vault.initialized && password !== confirmPassword) return
    await vault.submit(password)
    setPassword("")
    setConfirmPassword("")
  }

  return (
    <main
      ref={containerRef}
      className="min-h-screen grid place-items-center bg-background text-foreground font-sans relative overflow-hidden"
    >
      {/* Subtle dot texture */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.5 0 0 / 0.06) 0.5px, transparent 0.5px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Ambient background blobs — 4 layers for depth */}
      <div
        ref={setBlobRef(0)}
        className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 blur-[100px] z-[1]"
      />
      <div
        ref={setBlobRef(1)}
        className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[100px] z-[1]"
      />
      <div
        ref={setBlobRef(2)}
        className="absolute top-[5%] right-[-8%] w-[35%] h-[35%] rounded-full bg-amber-500/12 blur-[90px] z-[1]"
      />
      <div
        ref={setBlobRef(3)}
        className="absolute bottom-[10%] left-[-8%] w-[30%] h-[30%] rounded-full bg-violet-500/12 blur-[90px] z-[1]"
      />

      {/* Form — truly centered on the full page */}
      <div ref={contentRef} className="w-full max-w-sm px-6 relative z-10">
        <div className="w-full text-center">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("lock.passwordPlaceholder")}
                  autoFocus
                  required
                  disabled={vault.submitting}
                  className="h-10 pl-10 pr-11 text-sm bg-background/50 border-border rounded-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={vault.submitting}
                  className="absolute left-1 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button
                  type="submit"
                  disabled={vault.submitting || (!vault.initialized && password !== confirmPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-xs transition-all disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={vault.initialized ? t("lock.unlockButton") : t("lock.createButton")}
                >
                  {vault.submitting ? (
                    <div className="size-3.5 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                </button>
              </div>
            </div>
            {!vault.initialized && (
              <div className="space-y-2 animate-in fade-in">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("lock.confirmPlaceholder")}
                    required
                    disabled={vault.submitting}
                    className="h-10 pl-10 pr-4 text-sm bg-background/50 border-border rounded-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={vault.submitting}
                    className="absolute left-1 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

              </div>
            )}
          </form>

          {/* Checking spinner — no text */}
          {vault.checking && (
            <div className="flex items-center justify-center mt-6">
              <div className="size-4 animate-spin rounded-full border-2 border-border border-t-foreground/30" />
            </div>
          )}

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
      </div>
    </main>
  )
}
