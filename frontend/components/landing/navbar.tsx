"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import Link from "next/link"

const navLinks = [
  { label: "Можливості", href: "/about" },
  { label: "Тарифи", href: "/pricing" },
  { label: "Про продукт", href: "/about" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">V</span>
          </div>
          <span className="font-semibold text-foreground text-base tracking-tight">Vardi</span>
        </a>

        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
          >
            Увійти
          </Link>
          <Link
            href="/auth"
            className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Залетіти безкоштовно
          </Link>
        </div>

        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-white border-b border-border px-6 py-4 flex flex-col gap-4">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-border">
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Увійти
            </Link>
            <Link
              href="/auth"
              className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Залетіти безкоштовно
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
