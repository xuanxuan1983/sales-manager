// import axios from 'axios'
// 实际项目中取消注释，用于调用邮件/短信网关API

// ============ 通知服务 ============
// 严重事件自动告警（邮件 + 短信）
// 实际项目中替换为真实的邮件/短信服务

interface NotifyConfig {
  to: string[]        // 收件人邮箱/手机号
  subject: string     // 主题
  content: string     // 内容
  type: 'email' | 'sms' | 'both'
}

// 模拟发送（实际项目接入企业邮件/短信网关）
export async function sendNotification(config: NotifyConfig): Promise<boolean> {
  console.log('[通知服务]', config)

  // 邮件发送（示例：使用企业SMTP或第三方服务如SendGrid）
  if (config.type === 'email' || config.type === 'both') {
    try {
      // 实际接入示例：
      // await axios.post('/api/notify/email', {
      //   to: config.to,
      //   subject: config.subject,
      //   body: config.content
      // })
      console.log('[邮件通知] 已发送给:', config.to.join(', '))
    } catch (e) {
      console.error('[邮件通知] 发送失败:', e)
      return false
    }
  }

  // 短信发送（示例：使用阿里云/腾讯云短信服务）
  if (config.type === 'sms' || config.type === 'both') {
    try {
      // 实际接入示例：
      // await axios.post('/api/notify/sms', {
      //   phoneNumbers: config.to,
      //   templateCode: 'SMS_xxxx',
      //   templateParam: { content: config.content.substring(0, 100) }
      // })
      console.log('[短信通知] 已发送给:', config.to.join(', '))
    } catch (e) {
      console.error('[短信通知] 发送失败:', e)
      return false
    }
  }

  return true
}

// 严重事件告警模板
export function createSevereAlertMessage(event: {
  reportNo: string
  eventType: string
  severity: string
  institutionName: string
  eventDescription: string
  batchNo: string
  udiPi: string
}): { subject: string; content: string } {
  const subject = `🚨 严重不良事件告警 - ${event.reportNo}`
  const content = `
【严重不良事件告警】

上报编号: ${event.reportNo}
事件类型: ${event.eventType}
严重程度: ${event.severity}
发生机构: ${event.institutionName}
涉及批号: ${event.batchNo}
UDI-PI: ${event.udiPi}

事件描述:
${event.eventDescription}

请立即启动调查程序，并在24小时内上报国家药监局。

—— 医美销售追溯系统 · 不良事件监测
  `.trim()

  return { subject, content }
}

// 批量通知（同批次多事件时合并发送）
export async function notifyBatchEvents(events: Array<{
  reportNo: string
  eventType: string
  severity: string
  institutionName: string
  batchNo: string
}>, recipients: string[]): Promise<boolean> {
  const subject = `⚠️ 批次 ${events[0].batchNo} 关联 ${events.length} 起不良事件`
  const content = `
【批次关联告警】

批号: ${events[0].batchNo}
关联事件数: ${events.length}

事件列表:
${events.map((e, i) => `${i + 1}. ${e.reportNo} | ${e.eventType} | ${e.severity} | ${e.institutionName}`).join('\n')}

建议立即暂停该批次产品销售，启动召回评估。

—— 医美销售追溯系统 · 不良事件监测
  `.trim()

  return sendNotification({
    to: recipients,
    subject,
    content,
    type: 'both'
  })
}
