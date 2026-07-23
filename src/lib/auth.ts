// 前端 auth 工具：token 存取、登录状态检查
const TOKEN_KEY = 'mnemo_token'
const REFRESH_KEY = 'mnemo_refresh'
const USER_KEY = 'mnemo_user'

export function saveAuth(token: string, refresh: string, userId: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REFRESH_KEY, refresh)
  localStorage.setItem(USER_KEY, JSON.stringify({ user_id: userId, username }))
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): { user_id: string; username: string } | null {
  const s = localStorage.getItem(USER_KEY)
  return s ? JSON.parse(s) : null
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  const token = getToken()
  if (!token) return false
  // 检查 JWT 是否过期（不验签，只看 exp）
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
