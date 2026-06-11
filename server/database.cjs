const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/sales-manager.db')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })
const db = new Database(dbPath)

// 启用 WAL 模式，提高并发性能
db.pragma('journal_mode = WAL')

// 初始化表结构
function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'sales' CHECK(role IN ('admin', 'manager', 'sales', 'warehouse')),
      region_id TEXT,
      city_id TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 产品表
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      spec TEXT NOT NULL,
      category TEXT DEFAULT 'collagen',
      udi_di TEXT UNIQUE,
      manufacturer TEXT,
      storage_temp TEXT DEFAULT '2-8°C',
      shelf_life_months INTEGER DEFAULT 24,
      is_udi_required BOOLEAN DEFAULT 1,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'discontinued', 'pending')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 批次表
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      batch_no TEXT UNIQUE NOT NULL,
      production_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      remaining INTEGER DEFAULT 0,
      storage_temp TEXT DEFAULT '2-8°C',
      status TEXT DEFAULT 'in_stock' CHECK(status IN ('in_stock', 'shipping', 'sold_out', 'expired', 'recalled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // UDI 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS udis (
      id TEXT PRIMARY KEY,
      di TEXT NOT NULL,
      pi TEXT UNIQUE NOT NULL,
      batch_no TEXT NOT NULL,
      serial_no TEXT NOT NULL,
      product_id TEXT NOT NULL,
      production_date TEXT,
      expiry_date TEXT,
      status TEXT DEFAULT 'in_stock' CHECK(status IN ('in_stock', 'sold', 'used', 'recalled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // 追溯记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS trace_records (
      id TEXT PRIMARY KEY,
      udi_di TEXT NOT NULL,
      udi_pi TEXT NOT NULL,
      batch_no TEXT NOT NULL,
      serial_no TEXT,
      product_id TEXT NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      to_type TEXT DEFAULT 'hospital',
      operation TEXT NOT NULL CHECK(operation IN ('inbound', 'outbound', 'return', 'recall')),
      quantity INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      operator TEXT,
      order_id TEXT,
      remark TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // 扫码验证记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_records (
      id TEXT PRIMARY KEY,
      raw_code TEXT NOT NULL,
      status TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      batch_no TEXT,
      serial_no TEXT,
      udi_di TEXT,
      udi_pi TEXT,
      operator TEXT DEFAULT '系统',
      institution TEXT,
      location TEXT,
      query_count INTEGER DEFAULT 1,
      is_first_query BOOLEAN DEFAULT 1,
      watermark_token TEXT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 机构表
  db.exec(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'clinic' CHECK(type IN ('hospital', 'clinic', 'beauty_salon')),
      province TEXT,
      city TEXT,
      district TEXT,
      address TEXT,
      contact TEXT,
      phone TEXT,
      email TEXT,
      license_no TEXT,
      is_authorized BOOLEAN DEFAULT 0,
      authorized_products TEXT,
      verify_status TEXT DEFAULT 'unverified' CHECK(verify_status IN ('verified', 'unverified', 'suspended')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 召回批次表
  db.exec(`
    CREATE TABLE IF NOT EXISTS recalled_batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT UNIQUE NOT NULL,
      product_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      recall_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'resolved')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // 胶原项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS collagen_projects (
      id TEXT PRIMARY KEY,
      archived_at DATETIME,
      name TEXT NOT NULL,
      city TEXT,
      owner TEXT NOT NULL,
      source TEXT,
      stage TEXT NOT NULL CHECK(stage IN ('线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停')),
      decision TEXT NOT NULL CHECK(decision IN ('复购', '续费陪跑', '二次启动', '样板沉淀', '普通维护', '暂停观察')),
      risk TEXT NOT NULL CHECK(risk IN ('低', '中', '高')),
      score INTEGER DEFAULT 0 CHECK(score >= 0 AND score <= 100),
      shipped_at TEXT,
      day30_status TEXT NOT NULL CHECK(day30_status IN ('未开始', '进行中', '已复盘', '暂停')),
      doctor_training TEXT NOT NULL CHECK(doctor_training IN ('未排期', '已排期', '已完成')),
      cases INTEGER DEFAULT 0,
      authorized_cases INTEGER DEFAULT 0,
      content_count INTEGER DEFAULT 0,
      geo_change INTEGER DEFAULT 0,
      next_action TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_collagen_projects_owner ON collagen_projects(owner);
    CREATE INDEX IF NOT EXISTS idx_collagen_projects_stage ON collagen_projects(stage);
    CREATE INDEX IF NOT EXISTS idx_collagen_projects_risk ON collagen_projects(risk);
    CREATE INDEX IF NOT EXISTS idx_collagen_projects_archived_at ON collagen_projects(archived_at);
  `)

  // 胶原项目跟进记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS collagen_follow_up_logs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      owner TEXT NOT NULL,
      completed_action TEXT NOT NULL,
      result TEXT NOT NULL,
      next_action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES collagen_projects(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_collagen_follow_up_logs_project_id ON collagen_follow_up_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_collagen_follow_up_logs_completed_at ON collagen_follow_up_logs(completed_at);
    CREATE INDEX IF NOT EXISTS idx_collagen_follow_up_logs_owner ON collagen_follow_up_logs(owner);
  `)

  // 胶原项目导入批次表
  db.exec(`
    CREATE TABLE IF NOT EXISTS collagen_project_import_batches (
      id TEXT PRIMARY KEY,
      filename TEXT,
      imported_by TEXT,
      total_rows INTEGER DEFAULT 0,
      success_rows INTEGER DEFAULT 0,
      failed_rows INTEGER DEFAULT 0,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  console.log('✅ Database initialized')
}

// 插入初始数据
function seedData() {
  const products = [
    {
      id: 'P001', name: '胶原蛋白植入剂', spec: '1ml/支',
      udi_di: '06973894820001', manufacturer: '示例医疗器械生产企业',
      shelf_life_months: 24
    },
    {
      id: 'P002', name: '胶原蛋白植入剂', spec: '2ml/支',
      udi_di: '06973894820002', manufacturer: '示例医疗器械生产企业',
      shelf_life_months: 24
    },
    {
      id: 'P003', name: '胶原蛋白水光', spec: '5ml/支',
      udi_di: '06973894820003', manufacturer: '示例医疗器械生产企业',
      shelf_life_months: 18
    }
  ]

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, spec, udi_di, manufacturer, shelf_life_months)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  products.forEach(p => insertProduct.run(p.id, p.name, p.spec, p.udi_di, p.manufacturer, p.shelf_life_months))

  const collagenProjects = [
    {
      id: 'cp-001',
      name: '北京颜研所',
      city: '北京',
      owner: '小赵',
      source: '直营',
      stage: '样板沉淀',
      decision: '样板沉淀',
      risk: '低',
      score: 92,
      shippedAt: '2026-05-08',
      day30Status: '已复盘',
      doctorTraining: '已完成',
      cases: 8,
      authorizedCases: 5,
      contentCount: 18,
      geoChange: 31,
      nextAction: '输出招商案例一页纸'
    },
    {
      id: 'cp-002',
      name: '上海华美医疗美容',
      city: '上海',
      owner: '小张',
      source: '渠道',
      stage: '复购判断',
      decision: '复购',
      risk: '低',
      score: 84,
      shippedAt: '2026-05-16',
      day30Status: '已复盘',
      doctorTraining: '已完成',
      cases: 6,
      authorizedCases: 3,
      contentCount: 12,
      geoChange: 18,
      nextAction: '确认第二批进货计划'
    },
    {
      id: 'cp-003',
      name: '杭州美颜连锁',
      city: '杭州',
      owner: '小李',
      source: '经销商',
      stage: '30天追踪',
      decision: '续费陪跑',
      risk: '中',
      score: 73,
      shippedAt: '2026-05-25',
      day30Status: '进行中',
      doctorTraining: '已完成',
      cases: 4,
      authorizedCases: 1,
      contentCount: 7,
      geoChange: 9,
      nextAction: '补病例授权和内容审核'
    },
    {
      id: 'cp-004',
      name: '广州丽人诊所',
      city: '广州',
      owner: '小王',
      source: '直营',
      stage: '已发货',
      decision: '二次启动',
      risk: '高',
      score: 58,
      shippedAt: '2026-06-01',
      day30Status: '未开始',
      doctorTraining: '已排期',
      cases: 1,
      authorizedCases: 0,
      contentCount: 0,
      geoChange: 0,
      nextAction: '重开老板和医生启动会'
    },
    {
      id: 'cp-005',
      name: '深圳美肤医院',
      city: '深圳',
      owner: '小刘',
      source: '渠道',
      stage: '待启动会',
      decision: '普通维护',
      risk: '中',
      score: 66,
      shippedAt: null,
      day30Status: '未开始',
      doctorTraining: '未排期',
      cases: 0,
      authorizedCases: 0,
      contentCount: 0,
      geoChange: 0,
      nextAction: '补注册证和主诊医生资料'
    },
    {
      id: 'cp-006',
      name: '成都美丽坊',
      city: '成都',
      owner: '小陈',
      source: '转介绍',
      stage: '待资料',
      decision: '暂停观察',
      risk: '高',
      score: 42,
      shippedAt: null,
      day30Status: '暂停',
      doctorTraining: '未排期',
      cases: 0,
      authorizedCases: 0,
      contentCount: 0,
      geoChange: 0,
      nextAction: '先核验机构资质和医生配合'
    }
  ]

  const insertCollagenProject = db.prepare(`
    INSERT OR IGNORE INTO collagen_projects (
      id, name, city, owner, source, stage, decision, risk, score, shipped_at,
      day30_status, doctor_training, cases, authorized_cases, content_count, geo_change, next_action
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  collagenProjects.forEach(project => insertCollagenProject.run(
    project.id,
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
  ))

  // 默认管理员账号 (密码: admin123)
  const bcrypt = require('bcryptjs')
  const hashedPassword = bcrypt.hashSync('admin123', 10)
  
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, name, role)
    VALUES (?, ?, ?, ?)
  `)
  insertUser.run('admin', hashedPassword, '系统管理员', 'admin')

  console.log('✅ Seed data inserted')
}

// 初始化
initDatabase()
seedData()

module.exports = db
