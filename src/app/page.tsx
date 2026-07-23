import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-6xl">🧠</div>
        <h1 className="text-4xl font-bold text-brand-700">记忆女神 Mnemo</h1>
        <p className="text-brand-500 text-lg">MemCore 记忆基础设施管理中心</p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/space"
            className="px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-medium"
          >
            📦 我的记忆空间
          </Link>
          <Link
            href="/admin"
            className="px-6 py-3 border-2 border-brand-300 text-brand-700 rounded-xl hover:bg-brand-50 transition font-medium"
          >
            ⚙️ 管理员后台
          </Link>
        </div>
      </div>
    </main>
  )
}
