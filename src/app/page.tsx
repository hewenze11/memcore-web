'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isLoggedIn } from '@/lib/auth'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace('/space')
    }
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#fdf6ee]">
      <div className="text-center space-y-6">
        <div className="text-6xl">🧠</div>
        <h1 className="text-4xl font-bold text-amber-800">记忆女神 Mnemo</h1>
        <p className="text-amber-500 text-lg">MemCore 记忆基础设施管理中心</p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/login"
            className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-medium"
          >
            登录 / 注册
          </Link>
          <Link
            href="/admin"
            className="px-6 py-3 border-2 border-amber-300 text-amber-700 rounded-xl hover:bg-amber-50 transition font-medium"
          >
            ⚙️ 管理员后台
          </Link>
        </div>
      </div>
    </main>
  )
}
