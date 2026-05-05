import Link from 'next/link'
import { AcademicPracticeHeader } from '@/components/pte/practice-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Headphones, Mic, PenSquare } from 'lucide-react'

export const metadata = {
  title: 'Practice Hub - PTE Academic',
  description: 'Choose a PTE Academic section to practice and improve your score.',
}

const sections = [
  {
    key: 'speaking',
    title: 'Speaking Practice',
    description: 'Practice Read Aloud, Repeat Sentence, Describe Image and more.',
    href: '/academic/practice/speaking',
    icon: Mic,
    color: 'text-sky-600 bg-sky-100',
  },
  {
    key: 'writing',
    title: 'Writing Practice',
    description: 'Practice Summarize Written Text and Essay writing with AI feedback.',
    href: '/academic/practice/writing',
    icon: PenSquare,
    color: 'text-amber-600 bg-amber-100',
  },
  {
    key: 'reading',
    title: 'Reading Practice',
    description: 'Practice reading comprehension, multiple choice, and fill-in-the-blanks.',
    href: '/academic/practice/reading',
    icon: BookOpen,
    color: 'text-emerald-600 bg-emerald-100',
  },
  {
    key: 'listening',
    title: 'Listening Practice',
    description: 'Practice audio comprehension tasks with instant scoring.',
    href: '/academic/practice/listening',
    icon: Headphones,
    color: 'text-violet-600 bg-violet-100',
  },
]

export default function PracticeHomePage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AcademicPracticeHeader section="practice" showFilters={false} />

        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Link key={section.key} href={section.href} className="group block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${section.color}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{section.key}</span>
                </div>
                <div className="mt-5 space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                  <p className="text-sm leading-6 text-slate-600">{section.description}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">How to use the Practice Hub</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Select a section, choose a question, and receive instant scoring and feedback to improve your PTE reading, writing, listening and speaking skills.
              </p>
            </div>
            <Link href="/academic/analytics" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              View Progress Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
