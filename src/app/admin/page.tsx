'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://172.236.254.239:31012'
const TOKEN = 'memcore-test-token-m1-m5'

interface UserRow {
  user_id: string
  message_count: number
  last_active: string
  first_active: string
}

interface GlobalStats {
  total_users: number
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

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [usersR, statsR] = await Promise.all([
        api('/admin/users'),
        api('/admin/stats'),
      ])
      const usersData = await usersR.json()
      const statsData = await statsR.json()
      setUsers(usersData.users || [])
      setGlobalStats(statsData)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm(`确定要软删除用户 ${userId.slice(0, 8)}... 的所有记忆吗？`)) return
    setDeleting(userId)
    try {
      const r = await api(`/admin/user/${userId}`, { method: 'DELETE' })
      const data = await r.json()
      if (data.ok) {
        alert(`已软删除 ${data.messages_deleted} 条记忆`)
        fetchData()
      }
    } finally {
      setDeleting(null)
    }
  }

  const filteredUsers = users.filter(u =>
    u.user_id.toLowerCase().includes(search.toLowerCase())
  )

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">⚙️ 管理员后台</h1>
          <p className="text-brand-400 text-sm mt-1">MemCore 系统管理</p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={fetchData} className="text-sm text-brand-500 hover:text-brand-700 transition">↺ 刷新</button>
          <a href="/" className="text-brand-500 hover:underline text-sm">← 返回首页</a>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-brand-400 py-20">加载中...</div>
      ) : (
        <>
          {/* 全局统计 */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: '总用户数', value: globalStats?.total_users || 0, icon: '👥' },
              { label: '总消息数', value: globalStats?.total_messages || 0, icon: '💬' },
              { label: '总摘要数', value: globalStats?.total_summaries || 0, icon: '📝' },
              { label: '核心文档', value: globalStats?.total_docs || 0, icon: '📄' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl border border-brand-100 p-5 shadow-sm">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-2xl font-bold text-brand-700">{item.value.toLocaleString()}</div>
                <div className="text-xs text-brand-400 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {/* 用户列表 */}
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm">
            <div className="p-5 border-b border-brand-50 flex items-center justify-between">
              <h2 className="font-semibold text-brand-700">用户列表</h2>
              <input
                type="text"
                placeholder="搜索 user_id..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="text-sm border border-brand-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center text-brand-300 py-12">暂无用户数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-50 text-brand-500 text-xs">
                      <th className="px-5 py-3 text-left font-medium">用户 ID</th>
                      <th className="px-5 py-3 text-right font-medium">消息数</th>
                      <th className="px-5 py-3 text-left font-medium">最后活跃</th>
                      <th className="px-5 py-3 text-left font-medium">首次记录</th>
                      <th className="px-5 py-3 text-center font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50">
                    {filteredUsers.map(user => (
                      <tr key={user.user_id} className="hover:bg-brand-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-brand-600 text-xs">{user.user_id}</td>
                        <td className="px-5 py-3 text-right font-medium text-brand-700">{user.message_count}</td>
                        <td className="px-5 py-3 text-brand-500 text-xs">{formatDate(user.last_active)}</td>
                        <td className="px-5 py-3 text-brand-400 text-xs">{formatDate(user.first_active)}</td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleDeleteUser(user.user_id)}
                            disabled={deleting === user.user_id}
                            className="px-3 py-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                          >
                            {deleting === user.user_id ? '处理中...' : '软删除'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
