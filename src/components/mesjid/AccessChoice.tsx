'use client'

import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, Users, Lock } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import Image from 'next/image'

interface AccessChoiceProps {
  onPrivate: () => void
  onTeacher: () => void
  onStudent: () => void
  onParent: () => void
}

export default function AccessChoice({ onPrivate, onTeacher, onStudent, onParent }: AccessChoiceProps) {
  const { language } = useStore()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const options = [
    {
      key: 'teacher',
      label: t(language, 'publicRole.teacher') || 'Teacher (Ustaz)',
      desc: t(language, 'publicRole.teacherDesc') || 'Manage students, tests, attendance',
      icon: BookOpen,
      color: 'bg-blue-500/10 text-blue-400 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]',
      iconBg: 'bg-blue-500/10',
      onClick: onTeacher,
    },
    {
      key: 'student',
      label: t(language, 'publicRole.student') || 'Student',
      desc: t(language, 'publicRole.studentDesc') || 'View results, daily tasks, debts',
      icon: GraduationCap,
      color: 'bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]',
      iconBg: 'bg-emerald-500/10',
      onClick: onStudent,
    },
    {
      key: 'parent',
      label: t(language, 'publicRole.parent') || 'Parent',
      desc: t(language, 'publicRole.parentDesc') || 'View child progress & chat',
      icon: Users,
      color: 'bg-purple-500/10 text-purple-400 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]',
      iconBg: 'bg-purple-500/10',
      onClick: onParent,
    },
  ]

  return (
    <div className="fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center p-4">
      <motion.div
        className="glass-card p-6 sm:p-8 w-full max-w-md"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Logo + Title */}
        <motion.div variants={item} className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 rounded-2xl overflow-hidden shadow-lg">
            <Image src="/asmya-logo.png" alt="ASMYA" width={80} height={80} className="object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">ASMYA</h1>
          <p className="text-sm text-muted-foreground">Abubeker Siddiq Masjid Youth Association</p>
        </motion.div>

        {/* Teacher / Student / Parent */}
        <div className="flex flex-col gap-3">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <motion.button
                key={opt.key}
                variants={item}
                onClick={opt.onClick}
                className={`glass-card p-4 flex items-center gap-4 cursor-pointer
                  transition-all duration-200 hover:scale-[1.01] group text-left ${opt.color}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${opt.iconBg} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-foreground">{opt.label}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Private Access */}
        <motion.button
          variants={item}
          onClick={onPrivate}
          className="glass-card p-4 flex items-center gap-4 cursor-pointer
            transition-all duration-200 hover:scale-[1.01] hover:border-amber-500/30
            hover:shadow-[0_0_20px_rgba(217,119,6,0.1)] group text-left w-full"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground">Admin (Amir)</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Men/Women administration side</p>
          </div>
        </motion.button>
      </motion.div>
    </div>
  )
}