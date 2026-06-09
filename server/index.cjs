const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// 数据库初始化
const db = require('./database.cjs')

// 路由
app.use('/api/auth', require('./routes/auth.cjs'))
app.use('/api/scan', require('./routes/scan.cjs'))
app.use('/api/collagen-projects', require('./routes/collagenProjects.cjs'))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'OK', data: { timestamp: new Date().toISOString() } })
})

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 API: http://localhost:${PORT}/api`)
  console.log(`💊 Health: http://localhost:${PORT}/api/health`)
})

module.exports = app
