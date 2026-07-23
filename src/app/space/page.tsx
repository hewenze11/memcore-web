'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://172.236.254.239:31012'
const TOKEN = 'memcore-test-token-m1-m5'

interface Stats {
  total_count: number
  by_layer: { L1?: number; L2?: number; L4?: number }
}

interface Topic {
  id: string
  name: string
  message_count: number
}

interface DailyResult {
  date: string
  topics: Topic[]
  message_count: number
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

export default function SpacePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [daily, setDaily] = useState<DailyResult | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const MAX_BYTES = 10 * 1024 * 1024 // 免费版 10MB

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchDaily(selectedDate)
  }, [selectedDate])

  async function fetchStats() {
    try {
      const r = await api('/memory/stats')
      const data = await r.json()
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDaily(date: string) {
    const r = await api(`/memory/daily?date=${date}`)
    const data = await r.json()
    setDaily(data)
  }

  async function handleDeleteAll() {
    if (!confirm('确定要软删除所有 L1 记忆吗？此操作不可恢复。')) return
    setDeleting(true)
    try {
      const r = await api('/memory/me', { method: 'DELETE', body: JSON.stringify({ confirm: true }) })
      const data = await r.json()
      alert(`已删除 ${data.deleted_count} 条记忆`)
      fetchStats()
    } finally {
      setDeleting(false)
    }
  }

  const usedL2 = stats?.by_layer?.L2 || 0
  const usedL4 = stats?.by_layer?.L4 || 0
  const usedBytes = usedL2 + usedL4
  const usedPct = Math.min((usedBytes / MAX_BYTES) * 100, 100)
  const isOverQuota = usedPct >= 90

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">📦 我的记忆空间</h1>
          <p className="text-brand-400 text-sm mt-1">MemCore 记忆管理中心</p>
        </div>
        <a href="/" className="text-brand-500 hover:underline text-sm">← 返回首页</a>
      </div>

      {loading ? (
        <div className="text-center text-brand-400 py-20">加载中...</div>
      ) : (
        <>
          {/* 配额卡片 */}
          <div className={`rounded-2xl p-6 mb-6 ${isOverQuota ? 'bg-red-50 border border-red-200' : 'bg-white border border-brand-100'} shadow-sm`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="font-semibold text-brand-700">存储配额</h2>
                <p className="text-sm text-brand-400 mt-0.5">免费版 · 10MB</p>
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${isOverQuota ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
                {usedPct.toFixed(1)}% 已用
              </span>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-brand-100 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${isOverQuota ? 'bg-red-400' : 'bg-brand-400'}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-brand-400">
              <span>{(usedBytes / 1024).toFixed(1)} KB 已用</span>
              <span>10,240 KB 总量</span>
            </div>

            {isOverQuota && (
              <div className="mt-3 p-3 bg-red-100 rounded-lg text-sm text-red-700">
                ⚠️ 存储空间接近上限，最早的记忆已被归档。删除旧记忆或升级套餐以恢复。
              </div>
            )}
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: '原始对话', value: stats?.total_count || 0, unit: '条', color: 'bg-amber-50 border-amber-100 text-amber-700' },
              { label: 'L2 摘要', value: stats?.by_layer?.L2 ? (stats.by_layer.L2 / 1024).toFixed(1) + ' KB' : '0 KB', unit: '', color: 'bg-blue-50 border-blue-100 text-blue-700' },
              { label: '核心文档', value: stats?.by_layer?.L4 ? (stats.by_layer.L4 / 1024).toFixed(1) + ' KB' : '0 KB', unit: '', color: 'bg-green-50 border-green-100 text-green-700' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-4 border ${item.color}`}>
                <div className="text-xl font-bold">{item.value}{item.unit}</div>
                <div className="text-xs mt-1 opacity-70">{item.label}</div>
              </div>
            ))}
          </div>

          {/* 日期选择 + 话题列表 */}
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-brand-700">📅 按日期查看记忆</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-sm border border-brand-200 rounded-lg px-3 py-1.5 text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {daily?.message_count === 0 ? (
              <p className="text-brand-300 text-center py-8">这一天没有记忆记录</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-brand-400 mb-3">共 {daily?.message_count || 0} 条对话 · {daily?.topics?.length || 0} 个话题</p>
                {daily?.topics?.map(topic => (
                  <div key={topic.id} className="flex items-center justify-between p-3 bg-brand-50 rounded-xl">
                    <span className="text-brand-700 font-medium text-sm">{topic.name}</span>
                    <span className="text-brand-400 text-xs">{topic.message_count} 条对话</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 危险操作 */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
            <h2 className="font-semibold text-red-600 mb-2">⚠️ 危险操作</h2>
            <p className="text-sm text-gray-500 mb-4">软删除全部 L1 原始对话（记录仍保留但不可见）</p>
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {deleting ? '处理中...' : '清空我的记忆'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
