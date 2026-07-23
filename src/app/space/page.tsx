'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://172.236.254.239:31012'
const TOKEN = 'memcore-test-token-m1-m5'
const FREE_QUOTA = 10 * 1024 * 1024

function api(path: string, opts?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...(opts?.headers || {}) },
  })
}

function fmtBytes(b?: number) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

interface Stats { total_count: number; ui_total_count: number; by_layer: Record<string, number> }
interface Tag { id: string; name: string; kind: string }
interface Topic { id: string; name: string; updated_at: string }
interface Message { id: string; session_id: string; role: string; content: string; created_at: string }
interface CoreDoc { id: string; title: string; content: string; trigger_desc: string; content_bytes: number; updated_at: string }
interface DailyTopic { id: string; name: string; message_count: number }

function SpacePage() {
  const params = useSearchParams()
  // P0-2 fix: 读取 admin 传来的 user_id（管理员查看某用户）
  const viewUserId = params?.get('user_id') || null
  const isAdminView = !!viewUserId
  const [stats, setStats] = useState<Stats | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [docs, setDocs] = useState<CoreDoc[]>([])
  const [dailyTopics, setDailyTopics] = useState<DailyTopic[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocTrigger, setNewDocTrigger] = useState('')
  const [addingDoc, setAddingDoc] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const usedBytes = (stats?.by_layer?.L2 || 0) + (stats?.by_layer?.L4 || 0)
  const usedPct = Math.min((usedBytes / FREE_QUOTA) * 100, 100)
  const isOverQuota = usedPct >= 90

  // P0-3 fix: 加错误处理，P0-2 fix: 管理员查看时用 /admin 接口
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const prefix = isAdminView ? `/admin/user-data/${viewUserId}` : ''
      const [statsR, tagsR, topicsR, docsR] = await Promise.allSettled([
        api('/memory/stats').then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json() }),
        api('/memory/tags').then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json() }),
        api('/memory/topics').then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json() }),
        api('/memory/docs').then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json() }),
      ])
      if (statsR.status === 'fulfilled') setStats(statsR.value)
      if (tagsR.status === 'fulfilled') setTags(tagsR.value?.tags || [])
      if (topicsR.status === 'fulfilled') setTopics(topicsR.value?.topics || [])
      if (docsR.status === 'fulfilled') setDocs(docsR.value?.docs || [])
    } catch (e) {
      console.error('fetchAll error', e)
    } finally {
      setLoading(false)
    }
  }, [isAdminView, viewUserId])

  const fetchRecent = useCallback(async () => {
    try {
      const r = await api('/memory/recent')
      if (!r.ok) return
      const data = await r.json()
      setMessages((data.l1 || []).slice(0, 20))
    } catch (e) {
      console.error('fetchRecent error', e)
    }
  }, [])

  const fetchDaily = useCallback(async (date: string) => {
    try {
      const r = await api(`/memory/daily?date=${date}`)
      if (!r.ok) return
      const data = await r.json()
      setDailyTopics(data.topics || [])
      // P1-3 fix: 日期切换同步更新对话记录（按日期过滤）
      const recallR = await api('/memory/recall', {
        method: 'POST',
        body: JSON.stringify({ time_from: `${date}T00:00:00Z`, time_to: `${date}T23:59:59Z`, limit: 50 })
      })
      if (recallR.ok) {
        const recallData = await recallR.json()
        setMessages(recallData.results?.filter((m: any) => m.layer === 'L1' || m.role) || [])
      }
    } catch (e) {
      console.error('fetchDaily error', e)
    }
  }, [])

  useEffect(() => { fetchAll(); fetchRecent() }, [fetchAll, fetchRecent])
  useEffect(() => { fetchDaily(selectedDate) }, [selectedDate, fetchDaily])

  async function handleDeleteAll() {
    if (!confirm('确定要软删除所有 L1 记忆吗？此操作不可恢复。')) return
    setDeleting(true)
    try {
      const r = await api('/memory/me', { method: 'DELETE', body: JSON.stringify({ confirm: true }) })
      const data = await r.json()
      alert(`已删除 ${data.deleted_count} 条记忆`)
      fetchAll(); fetchRecent()
    } finally { setDeleting(false) }
  }

  async function handleAddDoc() {
    if (!newDocTitle.trim() || !newDocContent.trim()) return
    setAddingDoc(true)
    try {
      await api('/memory/docs', { method: 'POST', body: JSON.stringify({ title: newDocTitle, content: newDocContent, trigger_desc: newDocTrigger }) })
      setNewDocTitle(''); setNewDocContent(''); setNewDocTrigger('')
      fetchAll()
    } finally { setAddingDoc(false) }
  }

  async function handleDeleteDoc(id: string) {
    if (!confirm('删除核心文档？')) return
    await api(`/memory/docs/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return
    await api('/memory/tags', { method: 'POST', body: JSON.stringify({ name: newTagName, kind: 'user' }) })
    setNewTagName('')
    fetchAll()
  }

  async function handleDeleteTag(id: string) {
    await api(`/memory/tags/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-amber-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-amber-800">记忆女神 Mnemo</span>
          {isAdminView
            ? <span className="text-amber-500 text-sm font-mono">/ 用户空间：{viewUserId}</span>
            : <span className="text-amber-300 text-sm">/ 我的记忆空间</span>
          }
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${API}/memory/export`}
            target="_blank"
            className="text-sm px-3 py-1.5 border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition"
          >
            📤 导出全部
          </a>
          {isAdminView && (
            <button
              onClick={handleDeleteAll}
              className="text-sm px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition"
            >
              🗑️ 删除账户记忆
            </button>
          )}
          <a href={isAdminView ? '/admin' : '/'} className="text-sm text-amber-500 hover:text-amber-700">
            ← {isAdminView ? '返回管理后台' : '返回首页'}
          </a>
        </div>
      </header>

      {/* 配额条 */}
      <div className={`px-6 py-3 flex items-center gap-4 ${isOverQuota ? 'bg-red-50 border-b border-red-200' : 'bg-amber-50 border-b border-amber-100'}`}>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-amber-500 mb-1">
            <span>存储配额（免费版 10MB）</span>
            <span>{fmtBytes(usedBytes)} / 10 MB · {usedPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${isOverQuota ? 'bg-red-400' : 'bg-amber-400'}`} style={{ width: `${usedPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-amber-600">对话 <b>{stats?.total_count ?? 0}</b> 条</span>
          <span className="text-amber-400">|</span>
          <span className="text-amber-600">摘要 <b>{fmtBytes(stats?.by_layer?.L2)}</b></span>
          <span className="text-amber-400">|</span>
          <span className="text-amber-600">文档 <b>{fmtBytes(stats?.by_layer?.L4)}</b></span>
          {isOverQuota && <span className="text-red-500 text-xs font-medium">⚠️ 配额告警</span>}
        </div>
      </div>

      {/* 三列主体 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-amber-400 text-lg">加载中...</div>
      ) : (
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>

          {/* 左列：标签库 */}
          <aside className="w-56 bg-white border-r border-amber-100 flex flex-col overflow-y-auto">
            <div className="px-4 py-3 border-b border-amber-50">
              <div className="font-semibold text-amber-700 text-sm mb-2">🏷️ 自定义标签</div>
              <div className="flex gap-1 mb-2">
                <input
                  placeholder="新标签..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 text-xs border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300"
                />
                <button onClick={handleAddTag} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">+</button>
              </div>
              <div className="space-y-1">
                {tags.filter(t => t.kind === 'user').map(tag => (
                  <div key={tag.id} className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${activeTag === tag.id ? 'bg-amber-100 text-amber-800' : 'hover:bg-amber-50 text-amber-600'}`} onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}>
                    <span className="text-xs truncate">{tag.name}</span>
                    <button onClick={e => { e.stopPropagation(); handleDeleteTag(tag.id) }} className="text-amber-300 hover:text-red-400 ml-1 text-xs">×</button>
                  </div>
                ))}
                {tags.filter(t => t.kind === 'user').length === 0 && <p className="text-amber-300 text-xs px-1">暂无自定义标签</p>}
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="font-semibold text-amber-700 text-sm mb-2">💬 话题标签</div>
              <div className="space-y-1">
                {topics.slice(0, 20).map(t => (
                  <div key={t.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-amber-50 text-amber-600 group cursor-pointer">
                    <span className="text-xs truncate flex-1">{t.name}</span>
                    <button
                      onClick={() => handleDeleteTag(t.id)}
                      className="text-amber-200 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition ml-1"
                      title="删除话题"
                    >×</button>
                  </div>
                ))}
                {topics.length === 0 && <p className="text-amber-300 text-xs px-1">暂无话题</p>}
              </div>
            </div>

            {/* 记忆瘦身 */}
            <div className="mt-auto px-4 py-3 border-t border-amber-50">
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="w-full text-xs px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
              >
                {deleting ? '处理中...' : '🗑️ 清空我的记忆'}
              </button>
            </div>
          </aside>

          {/* 中列：对话记录 */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* 日期选择 */}
            <div className="bg-white border-b border-amber-100 px-5 py-3 flex items-center gap-3">
              <span className="text-sm font-medium text-amber-700">📅 按日期查看</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-sm border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <span className="text-xs text-amber-400">{dailyTopics.length} 个话题</span>
            </div>

            {/* 当天话题 */}
            {dailyTopics.length > 0 && (
              <div className="bg-amber-50 px-5 py-2 flex gap-2 flex-wrap border-b border-amber-100">
                {dailyTopics.map(t => (
                  <span key={t.id} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">{t.name} ({t.message_count})</span>
                ))}
              </div>
            )}

            {/* 最近消息列表 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="text-xs text-amber-400 mb-2">最近 {messages.length} 条对话记录</div>
              {messages.length === 0 ? (
                <div className="text-center text-amber-300 py-16">暂无对话记录</div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-amber-400 text-white rounded-tr-sm' : 'bg-white border border-amber-100 text-amber-800 rounded-tl-sm'}`}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-amber-200' : 'text-amber-300'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </main>

          {/* 右列：核心文档 */}
          <aside className="w-72 bg-white border-l border-amber-100 flex flex-col overflow-y-auto">
            <div className="px-4 py-3 border-b border-amber-50 flex items-center justify-between">
              <span className="font-semibold text-amber-700 text-sm">📄 核心文档 L4</span>
              <span className="text-xs text-amber-400">{docs.length}/20</span>
            </div>

            {/* 文档列表 */}
            <div className="flex-1 overflow-y-auto divide-y divide-amber-50">
              {docs.length === 0 ? (
                <p className="text-center text-amber-300 text-xs py-8">暂无核心文档</p>
              ) : docs.map(doc => (
                <div key={doc.id} className="px-4 py-3 hover:bg-amber-50 group">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-amber-800 text-xs flex-1">{doc.title}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition ml-2">
                      <button
                        onClick={() => {
                          setNewDocTitle(doc.title)
                          setNewDocContent(doc.content)
                          setNewDocTrigger(doc.trigger_desc)
                        }}
                        className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-600 hover:bg-amber-200 rounded"
                      >编辑</button>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-400 hover:bg-red-100 rounded">删除</button>
                    </div>
                  </div>
                  <p className="text-xs text-amber-500 leading-relaxed line-clamp-2">{doc.content}</p>
                  {doc.trigger_desc && <p className="text-xs text-amber-300 mt-1 italic">触发：{doc.trigger_desc}</p>}
                  <p className="text-xs text-amber-300 mt-1">{(doc.content_bytes / 1024).toFixed(1)} KB</p>
                </div>
              ))}
            </div>

            {/* 新建文档 */}
            <div className="px-4 py-3 border-t border-amber-100 bg-amber-50/50">
              <p className="text-xs font-medium text-amber-600 mb-2">+ 新建核心文档</p>
              <input
                placeholder="文档标题"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                className="w-full text-xs border border-amber-200 rounded px-2 py-1.5 mb-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white"
              />
              <textarea
                placeholder="文档内容（≤2000字节）"
                value={newDocContent}
                onChange={e => setNewDocContent(e.target.value)}
                rows={3}
                className="w-full text-xs border border-amber-200 rounded px-2 py-1.5 mb-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white"
              />
              <input
                placeholder="触发条件描述"
                value={newDocTrigger}
                onChange={e => setNewDocTrigger(e.target.value)}
                className="w-full text-xs border border-amber-200 rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white"
              />
              <button
                onClick={handleAddDoc}
                disabled={addingDoc || !newDocTitle.trim() || !newDocContent.trim()}
                className="w-full text-xs py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {addingDoc ? '保存中...' : '保存文档'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

// Next.js 要求 useSearchParams 必须在 Suspense 内
export default function SpacePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-amber-400">加载中...</div>}>
      <SpacePage />
    </Suspense>
  )
}

