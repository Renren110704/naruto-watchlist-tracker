import { Outlet } from 'react-router-dom'
import { BarChart3, NotebookPen, Sparkles } from 'lucide-react'
import { Logo } from '../components/Logo'

const FEATURES = [
  { icon: BarChart3, text: 'Track every Naruto, Shippuden and Boruto episode in watch order.' },
  { icon: NotebookPen, text: 'Write recaps, log new characters and every jutsu you spot.' },
  { icon: Sparkles, text: 'Pick up exactly where you left off with Continue Watching.' },
]

export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-ink-700/60 bg-ink-950 p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-fox-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 size-[460px] rounded-full bg-leaf-500/10 blur-3xl" />
        {/* Subtle spiral motif */}
        <svg className="pointer-events-none absolute -right-24 bottom-10 size-[420px] text-fox-500/[0.06]" viewBox="0 0 200 200" aria-hidden="true">
          <path
            d="M100 100m0-6a6 6 0 1 1-6 6c0-14 12-22 24-20 18 3 26 22 20 38-8 22-34 30-54 20C58 126 50 92 66 70c20-28 62-30 86-8 30 28 28 76-2 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
        <Logo />
        <div className="relative mt-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fox-400">Your watch companion</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight xl:text-5xl">
            Never lose your place on the <span className="text-fox-400">ninja way.</span>
          </h1>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-cream-300">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-800 text-fox-400">
                  <Icon className="size-4" />
                </span>
                <span className="pt-1.5 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-cream-500">A fan-made tracker. Not affiliated with the creators or publishers of Naruto.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <Outlet />
        </div>
      </section>
    </div>
  )
}
