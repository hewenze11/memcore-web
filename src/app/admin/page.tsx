'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://172.236.254.239:31012'
const TOKEN = 'memcore-test-token-m1-m5'

interface UserRow {
  user_id: string
  message_count: number
  last_active: string
  first_active: string
  used_bytes?: number
}

interface GlobalStats {
  total_users: number
  today_active: number
  total_messages: number
  total_summaries: number
  total_docs: number
}

function api(path: string, opts?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(opts?.headers || {}),
    },
  })
}

function fmtBytes(b?: number) {
  if (!b || b === 0) return '0 KB'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [usersR, statsR] = await Promise.all([
        api('/admin/users'),
        api('/admin/stats'),
      ])
      if (usersR.ok) { const d = await usersR.json(); setUsers(d.users || []) }
      if (statsR.ok) { const d = await statsR.json(); setGlobalStats(d) }
    } catch (e) {
      console.error('fetchData error', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm(`确定要软删除用户 ${userId.slice(0, 12)}... 的所有记忆数据吗？`)) return
    setDeleting(userId)
    try {
      const r = await api(`/admin/user/${userId}`, { method: 'DELETE' })
      if (!r.ok) { alert(`删除失败：HTTP ${r.status}`); return }
      const data = await r.json()
      if (data.ok) {
        alert(`已软删除 ${data.messages_deleted} 条记忆`)
        fetchData()
      } else {
        alert('删除失败，请重试')
      }
    } catch (e) {
      alert('网络错误，请重试')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = users.filter(u => u.user_id.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-amber-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-amber-800">MemCore 管理后台</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchData} className="text-sm text-amber-500 hover:text-amber-700">↺ 刷新</button>
          <a href="/" className="text-sm text-amber-500 hover:text-amber-700">退出登录</a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center text-amber-400 py-24 text-lg">加载中...</div>
        ) : (
          <>
            {/* 统计条 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: '用户总数', value: (globalStats?.total_users ?? 0).toLocaleString(), icon: '👥' },
                { label: '今日活跃', value: (globalStats?.today_active ?? 0).toLocaleString(), icon: '⚡' },
                { label: '总对话条数', value: (globalStats?.total_messages ?? 0).toLocaleString(), icon: '💬' },
                { label: '总摘要数', value: (globalStats?.total_summaries ?? 0).toLocaleString(), icon: '📝' },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-xl border border-amber-100 px-5 py-4 shadow-sm flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="text-xl font-bold text-amber-800">{item.value}</div>
                    <div className="text-xs text-amber-400">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 搜索框 */}
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm mb-1">
              <div className="px-5 py-3 border-b border-amber-50">
                <input
                  type="text"
                  placeholder="搜索用户 ID..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  className="w-full text-sm text-amber-800 placeholder:text-amber-300 focus:outline-none bg-transparent"
                />
              </div>

              {/* 用户列表表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-50 text-amber-500 text-xs uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">用户 ID</th>
                      <th className="px-5 py-3 text-left">注册时间</th>
                      <th className="px-5 py-3 text-right">对话总数</th>
                      <th className="px-5 py-3 text-right">存储量</th>
                      <th className="px-5 py-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-amber-300">暂无用户数据</td>
                      </tr>
                    ) : paged.map(user => (
                      <tr key={user.user_id} className="hover:bg-amber-50/50 transition-colors">
                        <td className="px-5 py-3 font-mono text-amber-700 text-xs">{user.user_id}</td>
                        <td className="px-5 py-3 text-amber-500 text-xs">{fmtDate(user.first_active)}</td>
                        <td className="px-5 py-3 text-right font-medium text-amber-800">{user.message_count.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-amber-500 text-xs">{fmtBytes(user.used_bytes)}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => router.push(`/space?user_id=${user.user_id}`)}
                              className="px-3 py-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition"
                            >
                              查看
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.user_id)}
                              disabled={deleting === user.user_id}
                              className="px-3 py-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                            >
                              {deleting === user.user_id ? '...' : '删除'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-amber-50 flex items-center justify-end gap-3 text-sm">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition"
                  >
                    上一页
                  </button>
                  <span className="text-amber-500">第 {page} / {totalPages} 页</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
