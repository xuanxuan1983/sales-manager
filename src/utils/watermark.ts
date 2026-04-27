// ============ 动态防伪水印生成器 ============
// 每次查询生成唯一防伪标识，防止截图伪造

export interface WatermarkConfig {
  productId: string
  batchNo: string
  serialNo: string
  queryCount: number
  timestamp?: Date
}

export interface WatermarkData {
  token: string
  timestamp: string
  qrData: string
  gradient: string
  hash: string
}

// 防伪渐变色池（每次随机选取）
const GRADIENT_POOL = [
  'linear-gradient(135deg, #0071E3, #00C6FF)',
  'linear-gradient(135deg, #34C759, #30D158)',
  'linear-gradient(135deg, #FF9500, #FFCC00)',
  'linear-gradient(135deg, #AF52DE, #BF5AF2)',
  'linear-gradient(135deg, #FF3B30, #FF6B6B)',
  'linear-gradient(135deg, #5856D6, #7B79E0)',
]

/**
 * 生成防伪令牌
 * 格式: TXF-YYYYMMDD-XXXX (X为随机字母数字)
 */
function generateToken(_productId: string, timestamp: Date): string {
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Array.from({ length: 4 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
  return `TXF-${dateStr}-${random}`
}

/**
 * 生成防伪哈希（用于后端校验）
 */
function generateHash(config: WatermarkConfig, token: string): string {
  const data = `${config.productId}|${config.batchNo}|${config.serialNo}|${token}|${config.queryCount}`
  // 简单哈希（实际项目用 crypto.subtle.sha256）
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
}

/**
 * 生成防伪二维码数据
 * 包含加密后的验证信息
 */
function generateQRData(config: WatermarkConfig, token: string, hash: string): string {
  const payload = {
    p: config.productId,
    b: config.batchNo,
    s: config.serialNo,
    q: config.queryCount,
    t: token,
    h: hash,
    ts: Date.now()
  }
  // Base64 编码（实际项目应使用加密）
  return btoa(JSON.stringify(payload))
}

/**
 * 生成动态防伪水印
 */
export function generateWatermark(config: WatermarkConfig): WatermarkData {
  const timestamp = config.timestamp || new Date()
  const token = generateToken(config.productId, timestamp)
  const hash = generateHash(config, token)
  const qrData = generateQRData(config, token, hash)
  const gradient = GRADIENT_POOL[Math.floor(Math.random() * GRADIENT_POOL.length)]

  return {
    token,
    timestamp: timestamp.toISOString(),
    qrData,
    gradient,
    hash
  }
}

/**
 * 验证防伪水印（后端校验用）
 */
export function verifyWatermark(
  config: WatermarkConfig,
  token: string,
  expectedHash: string
): boolean {
  const computedHash = generateHash(config, token)
  return computedHash === expectedHash
}

/**
 * 生成防伪背景图案（Canvas）
 */
export function createAntiFakePattern(
  canvas: HTMLCanvasElement,
  text: string,
  color: string = '#0071E3'
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = 200
  const height = 200
  canvas.width = width
  canvas.height = height

  ctx.fillStyle = 'transparent'
  ctx.clearRect(0, 0, width, height)

  // 绘制斜向文字
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(-Math.PI / 6)
  ctx.font = '14px monospace'
  ctx.fillStyle = color + '15' // 10% 透明度
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, 0)
  ctx.restore()

  // 绘制网格点
  ctx.fillStyle = color + '10'
  for (let x = 0; x < width; x += 20) {
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath()
      ctx.arc(x, y, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * 生成防伪印章 SVG
 */
export function generateSealSVG(token: string, gradient: string): string {
  const colors = gradient.match(/#[0-9A-F]{6}/gi) || ['#0071E3', '#00C6FF']
  return `
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]}"/>
          <stop offset="100%" style="stop-color:${colors[1] || colors[0]}"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="none" stroke="url(#sealGrad)" stroke-width="3" stroke-dasharray="8 4"/>
      <circle cx="60" cy="60" r="48" fill="none" stroke="url(#sealGrad)" stroke-width="1" opacity="0.5"/>
      <text x="60" y="45" text-anchor="middle" fill="${colors[0]}" font-size="11" font-weight="bold">天新福正品</text>
      <text x="60" y="65" text-anchor="middle" fill="${colors[0]}" font-size="9" font-family="monospace">${token.slice(-8)}</text>
      <text x="60" y="82" text-anchor="middle" fill="${colors[0]}" font-size="8" opacity="0.7">官方验证</text>
    </svg>
  `.trim()
}
