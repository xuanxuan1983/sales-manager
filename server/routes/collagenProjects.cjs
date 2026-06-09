const express = require('express')
const router = express.Router()
const db = require('../database.cjs')

const STAGES = ['线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停']
const DECISIONS = ['复购', '续费陪跑', '二次启动', '样板沉淀', '普通维护', '暂停观察']
const RISKS = ['低', '中', '高']
const DAY30_STATUSES = ['未开始', '进行中', '已复盘', '暂停']
const DOCTOR_TRAINING_STATUSES = ['未排期', '已排期', '已完成']

const createId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const toProject = row => ({
  id: row.id,
  archivedAt: row.archived_at || undefined,
  name: row.name,
  city: row.city || '',
  owner: row.owner,
  source: row.source || '',
  stage: row.stage,
  decision: row.decision,
  risk: row.risk,
  score: row.score,
  shippedAt: row.shipped_at || undefined,
  day30Status: row.day30_status,
  doctorTraining: row.doctor_training,
  cases: row.cases,
  authorizedCases: row.authorized_cases,
  contentCount: row.content_count,
  geoChange: row.geo_change,
  nextAction: row.next_action || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const toFollowUpLog = row => ({
  id: row.id,
  projectId: row.project_id,
  completedAt: row.completed_at,
  owner: row.owner,
  completedAction: row.completed_action,
  result: row.result,
  nextAction: row.next_action,
  createdAt: row.created_at
})

const clampInteger = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const normalized = Math.round(Number(value) || 0)
  return Math.min(max, Math.max(min, normalized))
}

const pickAllowed = (value, allowed, fallback) => allowed.includes(value) ? value : fallback

const normalizeProjectPayload = (payload, fallbackId) => {
  const {
    id = fallbackId,
    archivedAt,
    name,
    city = '',
    owner,
    source = '',
    stage = '线索',
    decision = '普通维护',
    risk = '中',
    score = 0,
    shippedAt,
    day30Status = '未开始',
    doctorTraining = '未排期',
    cases = 0,
    authorizedCases = 0,
    contentCount = 0,
    geoChange = 0,
    nextAction = ''
  } = payload

  const normalizedCases = clampInteger(cases)

  return {
    id: String(id || fallbackId).trim(),
    archivedAt: archivedAt || null,
    name: String(name || '').trim(),
    city: String(city).trim(),
    owner: String(owner || '').trim(),
    source: String(source).trim(),
    stage: pickAllowed(stage, STAGES, '线索'),
    decision: pickAllowed(decision, DECISIONS, '普通维护'),
    risk: pickAllowed(risk, RISKS, '中'),
    score: clampInteger(score, 0, 100),
    shippedAt: shippedAt || null,
    day30Status: pickAllowed(day30Status, DAY30_STATUSES, '未开始'),
    doctorTraining: pickAllowed(doctorTraining, DOCTOR_TRAINING_STATUSES, '未排期'),
    cases: normalizedCases,
    authorizedCases: Math.min(normalizedCases, clampInteger(authorizedCases)),
    contentCount: clampInteger(contentCount),
    geoChange: Math.round(Number(geoChange) || 0),
    nextAction: String(nextAction).trim()
  }
}

const insertProject = db.prepare(`
  INSERT INTO collagen_projects (
    id, archived_at, name, city, owner, source, stage, decision, risk, score, shipped_at,
    day30_status, doctor_training, cases, authorized_cases, content_count, geo_change, next_action
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const listAllProjects = () => db.prepare(`
  SELECT * FROM collagen_projects
  ORDER BY archived_at IS NOT NULL ASC, updated_at DESC, created_at DESC
`).all().map(toProject)

const getProjectWithLogs = id => {
  const project = db.prepare('SELECT * FROM collagen_projects WHERE id = ?').get(id)
  if (!project) return null

  const logs = db.prepare(`
    SELECT * FROM collagen_follow_up_logs
    WHERE project_id = ?
    ORDER BY completed_at DESC, created_at DESC
  `).all(id)

  return {
    ...toProject(project),
    followUpLogs: logs.map(toFollowUpLog)
  }
}

// GET /api/collagen-projects - 项目列表
router.get('/', (req, res) => {
  try {
    const {
      stage,
      risk,
      owner,
      archiveStatus = 'active',
      page = 1,
      pageSize = 50
    } = req.query

    const where = []
    const params = []

    if (stage && stage !== '全部') {
      where.push('stage = ?')
      params.push(stage)
    }

    if (risk && risk !== '全部') {
      where.push('risk = ?')
      params.push(risk)
    }

    if (owner && owner !== '全部') {
      where.push('owner = ?')
      params.push(owner)
    }

    if (archiveStatus === 'active') {
      where.push('archived_at IS NULL')
    } else if (archiveStatus === 'archived') {
      where.push('archived_at IS NOT NULL')
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const normalizedPage = clampInteger(page, 1)
    const normalizedPageSize = clampInteger(pageSize, 1, 200)
    const offset = (normalizedPage - 1) * normalizedPageSize

    const total = db.prepare(`SELECT COUNT(*) as count FROM collagen_projects ${whereSql}`).get(...params).count
    const rows = db.prepare(`
      SELECT * FROM collagen_projects
      ${whereSql}
      ORDER BY archived_at IS NOT NULL ASC, updated_at DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, normalizedPageSize, offset)

    res.json({
      code: 200,
      message: 'success',
      data: {
        list: rows.map(toProject),
        total,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        totalPages: Math.ceil(total / normalizedPageSize)
      }
    })
  } catch (error) {
    console.error('List collagen projects error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// POST /api/collagen-projects/import - 批量导入项目
router.post('/import', (req, res) => {
  try {
    const projects = Array.isArray(req.body.projects) ? req.body.projects : []
    const mode = req.body.mode === 'append' ? 'append' : 'replace'

    if (!projects.length) {
      return res.json({ code: 400, message: '请提供要导入的项目数据', data: null })
    }

    const normalizedProjects = projects.map((project, index) => normalizeProjectPayload(project, project.id || createId('cp')))
    const invalidProject = normalizedProjects.find(project => !project.name || !project.owner)
    const ids = new Set()
    const duplicatedProject = normalizedProjects.find(project => {
      if (ids.has(project.id)) return true
      ids.add(project.id)
      return false
    })

    if (invalidProject) {
      return res.json({ code: 400, message: '机构名称和负责人必填', data: null })
    }

    if (duplicatedProject) {
      return res.json({ code: 400, message: `项目ID重复：${duplicatedProject.id}`, data: null })
    }

    const transaction = db.transaction(() => {
      if (mode === 'replace') {
        db.prepare('DELETE FROM collagen_follow_up_logs').run()
        db.prepare('DELETE FROM collagen_projects').run()
      }

      normalizedProjects.forEach(project => {
        insertProject.run(
          project.id,
          project.archivedAt,
          project.name,
          project.city,
          project.owner,
          project.source,
          project.stage,
          project.decision,
          project.risk,
          project.score,
          project.shippedAt,
          project.day30Status,
          project.doctorTraining,
          project.cases,
          project.authorizedCases,
          project.contentCount,
          project.geoChange,
          project.nextAction
        )
      })
    })

    transaction()

    const list = listAllProjects()
    res.json({
      code: 200,
      message: '导入成功',
      data: {
        list,
        total: list.length,
        imported: normalizedProjects.length,
        mode
      }
    })
  } catch (error) {
    console.error('Import collagen projects error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// DELETE /api/collagen-projects - 清空项目
router.delete('/', (req, res) => {
  try {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM collagen_follow_up_logs').run()
      db.prepare('DELETE FROM collagen_projects').run()
    })

    transaction()

    res.json({
      code: 200,
      message: '已清空胶原项目',
      data: {
        list: [],
        total: 0
      }
    })
  } catch (error) {
    console.error('Clear collagen projects error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// GET /api/collagen-projects/:id - 项目详情
router.get('/:id', (req, res) => {
  try {
    const project = getProjectWithLogs(req.params.id)
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在', data: null })
    }

    res.json({ code: 200, message: 'success', data: project })
  } catch (error) {
    console.error('Get collagen project error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// POST /api/collagen-projects - 新增项目
router.post('/', (req, res) => {
  try {
    const {
      name,
      city = '',
      owner,
      source = '',
      stage = '线索',
      decision = '普通维护',
      risk = '中',
      score = 0,
      shippedAt,
      day30Status = '未开始',
      doctorTraining = '未排期',
      cases = 0,
      authorizedCases = 0,
      contentCount = 0,
      geoChange = 0,
      nextAction = ''
    } = req.body

    if (!name || !owner) {
      return res.json({ code: 400, message: '机构名称和负责人必填', data: null })
    }

    const id = createId('cp')
    const normalizedCases = clampInteger(cases)
    const normalizedAuthorizedCases = Math.min(normalizedCases, clampInteger(authorizedCases))

    db.prepare(`
      INSERT INTO collagen_projects (
        id, name, city, owner, source, stage, decision, risk, score, shipped_at,
        day30_status, doctor_training, cases, authorized_cases, content_count, geo_change, next_action
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      String(name).trim(),
      String(city).trim(),
      String(owner).trim(),
      String(source).trim(),
      pickAllowed(stage, STAGES, '线索'),
      pickAllowed(decision, DECISIONS, '普通维护'),
      pickAllowed(risk, RISKS, '中'),
      clampInteger(score, 0, 100),
      shippedAt || null,
      pickAllowed(day30Status, DAY30_STATUSES, '未开始'),
      pickAllowed(doctorTraining, DOCTOR_TRAINING_STATUSES, '未排期'),
      normalizedCases,
      normalizedAuthorizedCases,
      clampInteger(contentCount),
      Math.round(Number(geoChange) || 0),
      String(nextAction).trim()
    )

    res.json({ code: 200, message: '创建成功', data: getProjectWithLogs(id) })
  } catch (error) {
    console.error('Create collagen project error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// PATCH /api/collagen-projects/:id - 更新项目
router.patch('/:id', (req, res) => {
  try {
    const project = getProjectWithLogs(req.params.id)
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在', data: null })
    }

    const next = {
      name: req.body.name !== undefined ? String(req.body.name).trim() : project.name,
      city: req.body.city !== undefined ? String(req.body.city).trim() : project.city,
      owner: req.body.owner !== undefined ? String(req.body.owner).trim() : project.owner,
      source: req.body.source !== undefined ? String(req.body.source).trim() : project.source,
      stage: req.body.stage !== undefined ? pickAllowed(req.body.stage, STAGES, project.stage) : project.stage,
      decision: req.body.decision !== undefined ? pickAllowed(req.body.decision, DECISIONS, project.decision) : project.decision,
      risk: req.body.risk !== undefined ? pickAllowed(req.body.risk, RISKS, project.risk) : project.risk,
      score: req.body.score !== undefined ? clampInteger(req.body.score, 0, 100) : project.score,
      shippedAt: req.body.shippedAt !== undefined ? req.body.shippedAt || null : project.shippedAt || null,
      day30Status: req.body.day30Status !== undefined ? pickAllowed(req.body.day30Status, DAY30_STATUSES, project.day30Status) : project.day30Status,
      doctorTraining: req.body.doctorTraining !== undefined ? pickAllowed(req.body.doctorTraining, DOCTOR_TRAINING_STATUSES, project.doctorTraining) : project.doctorTraining,
      cases: req.body.cases !== undefined ? clampInteger(req.body.cases) : project.cases,
      authorizedCases: req.body.authorizedCases !== undefined ? clampInteger(req.body.authorizedCases) : project.authorizedCases,
      contentCount: req.body.contentCount !== undefined ? clampInteger(req.body.contentCount) : project.contentCount,
      geoChange: req.body.geoChange !== undefined ? Math.round(Number(req.body.geoChange) || 0) : project.geoChange,
      nextAction: req.body.nextAction !== undefined ? String(req.body.nextAction).trim() : project.nextAction
    }

    next.authorizedCases = Math.min(next.cases, next.authorizedCases)

    if (!next.name || !next.owner) {
      return res.json({ code: 400, message: '机构名称和负责人必填', data: null })
    }

    db.prepare(`
      UPDATE collagen_projects
      SET name = ?, city = ?, owner = ?, source = ?, stage = ?, decision = ?, risk = ?,
          score = ?, shipped_at = ?, day30_status = ?, doctor_training = ?, cases = ?,
          authorized_cases = ?, content_count = ?, geo_change = ?, next_action = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      next.name,
      next.city,
      next.owner,
      next.source,
      next.stage,
      next.decision,
      next.risk,
      next.score,
      next.shippedAt,
      next.day30Status,
      next.doctorTraining,
      next.cases,
      next.authorizedCases,
      next.contentCount,
      next.geoChange,
      next.nextAction,
      req.params.id
    )

    res.json({ code: 200, message: '更新成功', data: getProjectWithLogs(req.params.id) })
  } catch (error) {
    console.error('Update collagen project error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// POST /api/collagen-projects/:id/archive - 归档项目
router.post('/:id/archive', (req, res) => {
  try {
    const project = getProjectWithLogs(req.params.id)
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在', data: null })
    }

    db.prepare(`
      UPDATE collagen_projects
      SET archived_at = CURRENT_TIMESTAMP, stage = '暂停', decision = '暂停观察', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id)

    res.json({ code: 200, message: '归档成功', data: getProjectWithLogs(req.params.id) })
  } catch (error) {
    console.error('Archive collagen project error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// POST /api/collagen-projects/:id/restore - 恢复项目
router.post('/:id/restore', (req, res) => {
  try {
    const project = getProjectWithLogs(req.params.id)
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在', data: null })
    }

    db.prepare(`
      UPDATE collagen_projects
      SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id)

    res.json({ code: 200, message: '恢复成功', data: getProjectWithLogs(req.params.id) })
  } catch (error) {
    console.error('Restore collagen project error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// POST /api/collagen-projects/:id/follow-ups - 完成跟进
router.post('/:id/follow-ups', (req, res) => {
  try {
    const project = getProjectWithLogs(req.params.id)
    if (!project) {
      return res.status(404).json({ code: 404, message: '项目不存在', data: null })
    }

    const { result = '已完成本次跟进', nextAction = '待补充下一步动作' } = req.body
    const logId = createId('ful')

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO collagen_follow_up_logs (id, project_id, owner, completed_action, result, next_action)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        req.params.id,
        project.owner,
        project.nextAction || '未填写下一步动作',
        String(result).trim() || '已完成本次跟进',
        String(nextAction).trim() || '待补充下一步动作'
      )

      db.prepare(`
        UPDATE collagen_projects
        SET next_action = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(String(nextAction).trim() || '待补充下一步动作', req.params.id)
    })

    transaction()

    res.json({ code: 200, message: '跟进记录已保存', data: getProjectWithLogs(req.params.id) })
  } catch (error) {
    console.error('Complete collagen follow-up error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

module.exports = router
