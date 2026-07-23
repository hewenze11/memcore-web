'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://172.236.254.239:31012'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
      const body: any = { username, password }
      if (tab === 'register' && email) body.email = email
      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || '请求失败')
        return
      }
      saveAuth(data.token, data.refresh_token, data.user_id, data.username)
      router.push('/space')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fdf6ee] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧠</div>
          <h1 className="text-2xl font-bold text-amber-800">记忆女神 Mnemo</h1>
          <p className="text-amber-400 text-sm mt-1">MemCore 记忆基础设施</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          {/* Tab */}
          <div className="flex border-b border-amber-100">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-3 text-sm font-medium transition ${tab === 'login' ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50' : 'text-amber-400 hover:text-amber-600'}`}
            >登录</button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 py-3 text-sm font-medium transition ${tab === 'register' ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50' : 'text-amber-400 hover:text-amber-600'}`}
            >注册</button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-xs text-amber-600 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="至少3个字符"
                required
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 bg-amber-50/30"
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-xs text-amber-600 mb-1">邮箱（可选）</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 bg-amber-50/30"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-amber-600 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少6位"
                required
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 bg-amber-50/30"
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition disabled:opacity-60"
            >
              {loading ? '处理中...' : tab === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
