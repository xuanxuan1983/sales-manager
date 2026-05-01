const jwt = require('jsonwebtoken')
const db = require('../database.cjs')

const JWT_SECRET = process.env.JWT_SECRET || 'tianxinfu-sales-manager-secret-key'

// 验证 token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌', data: null })
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // 查询用户信息
    const user = db.prepare('SELECT id, username, name, role, region_id, city_id, status FROM users WHERE id = ?').get(decoded.userId)
    
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ code: 401, message: '用户不存在或已禁用', data: null })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ code: 401, message: '令牌无效或已过期', data: null })
  }
}

// 角色权限检查
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未认证', data: null })
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足', data: null })
    }
    
    next()
  }
}

// 生成 token
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

module.exports = {
  authMiddleware,
  requireRole,
  generateToken,
  JWT_SECRET
}
