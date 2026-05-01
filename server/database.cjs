const Database = require('better-sqlite3')
const path = require('path')

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/sales-manager.db')
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

  console.log('✅ Database initialized')
}

// 插入初始数据
function seedData() {
  const products = [
    {
      id: 'P001', name: '天新福胶原蛋白植入剂', spec: '1ml/支',
      udi_di: '06973894820001', manufacturer: '天新福（北京）医疗器材股份有限公司',
      shelf_life_months: 24
    },
    {
      id: 'P002', name: '天新福胶原蛋白植入剂', spec: '2ml/支',
      udi_di: '06973894820002', manufacturer: '天新福（北京）医疗器材股份有限公司',
      shelf_life_months: 24
    },
    {
      id: 'P003', name: '天新福胶原蛋白水光', spec: '5ml/支',
      udi_di: '06973894820003', manufacturer: '天新福（北京）医疗器材股份有限公司',
      shelf_life_months: 18
    }
  ]

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, spec, udi_di, manufacturer, shelf_life_months)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  products.forEach(p => insertProduct.run(p.id, p.name, p.spec, p.udi_di, p.manufacturer, p.shelf_life_months))

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
