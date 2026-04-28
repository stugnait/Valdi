import { ArrowRight, Zap } from "lucide-react"
import { DashboardPreview } from "./dashboard-preview"

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden bg-white">
      {/* Subtle blue tint in top area */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-96 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, #eff6ff 0%, transparent 70%)" }}
      />

      {/* Badge */}
      <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-100 bg-accent mb-6">
        <Zap size={12} className="text-primary" />
        <span className="text-xs text-primary font-medium">
          Синхронізація з Monobank та Privat24 в реальному часі
        </span>
      </div>

      {/* Headline */}
      <h1 className="relative text-center text-4xl md:text-5xl lg:text-6xl font-bold text-foreground text-balance leading-tight max-w-4xl mb-5">
          Забудь про Excel. <br />
          Керуй фінансами <span className="text-primary">професійно</span>
      </h1>

      {/* Subheadline */}
      <p className="relative text-center text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8 text-pretty">
          Звільніть час для розвитку бізнесу, а не для формул. Автоматизуйте фінанси вашого агентства: від миттєвої синхронізації з банками до розрахунку реального прибутку з кожного проекту.
      </p>

      {/* CTA buttons */}
      <div className="relative flex flex-col sm:flex-row items-center gap-3 mb-14">
        <a
          href="#cta"
          className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors duration-200 shadow-sm"
        >
          Підключити агентство за 2 хвилини
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </a>
        <a
          href="#features"
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-slate-400 transition-all duration-200"
        >
          Подивитись можливості
        </a>
      </div>

      {/* Social proof */}
      <div className="relative flex items-center gap-3 mb-12 text-xs text-muted-foreground animate-fade-in">
        <div className="flex -space-x-2">
          {["#2563eb", "#10b981", "#f59e0b", "#ef4444"].map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border-2 border-white"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span>
          <strong className="text-foreground font-semibold">120+ агентств</strong> вже автоматизували фінансовий облік
        </span>
      </div>

      {/* Dashboard */}
      <div className="relative w-full max-w-5xl">
        <DashboardPreview />
      </div>
    </section>
  )
}
