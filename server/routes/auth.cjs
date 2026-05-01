const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const db = require('../database.cjs')
const { generateToken, authMiddleware } = require('../middleware/auth.cjs')

// POST /api/auth/login - 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.json({ code: 400, message: '请提供用户名和密码', data: null })
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)

    if (!user) {
      return res.json({ code: 401, message: '用户名或密码错误', data: null })
    }

    if (user.status === 'inactive') {
      return res.json({ code: 401, message: '账号已被禁用', data: null })
    }

    const isValid = bcrypt.compareSync(password, user.password)
    if (!isValid) {
      return res.json({ code: 401, message: '用户名或密码错误', data: null })
    }

    const token = generateToken(user.id)

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          regionId: user.region_id,
          cityId: user.city_id
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// POST /api/auth/register - 注册（仅管理员可用）
router.post('/register', authMiddleware, (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.json({ code: 403, message: '权限不足', data: null })
    }

    const { username, password, name, role = 'sales', regionId, cityId, phone, email } = req.body

    if (!username || !password || !name) {
      return res.json({ code: 400, message: '请提供完整信息', data: null })
    }

    // 检查用户名是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      return res.json({ code: 400, message: '用户名已存在', data: null })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    const result = db.prepare(`
      INSERT INTO users (username, password, name, role, region_id, city_id, phone, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, name, role, regionId, cityId, phone, email)

    res.json({
      code: 200,
      message: '注册成功',
      data: { id: result.lastInsertRowid, username, name, role }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// GET /api/auth/me - 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
      regionId: req.user.region_id,
      cityId: req.user.city_id
    }
  })
})

// GET /api/auth/users - 用户列表（仅管理员）
router.get('/users', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.json({ code: 403, message: '权限不足', data: null })
    }

    const users = db.prepare('SELECT id, username, name, role, region_id, city_id, phone, status, created_at FROM users').all()

    res.json({
      code: 200,
      message: 'success',
      data: users
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

module.exports = router
