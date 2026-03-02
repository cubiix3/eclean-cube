import { app, shell } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { getHardwareInfo, getDiskHealth } from './hardwareInfo'
import { getSystemOverview } from './systemInfo'

export async function generateReport(): Promise<{ path: string; success: boolean }> {
  try {
    const [hardwareInfo, systemOverview, diskHealth] = await Promise.all([
      getHardwareInfo(),
      getSystemOverview(),
      getDiskHealth()
    ])

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Calculate health score
    const diskPercent = systemOverview.disk.percent
    const ramPercent = systemOverview.ram.percent
    const healthScore = Math.max(
      0,
      Math.min(100, Math.round(100 - (diskPercent * 0.4 + ramPercent * 0.3 + systemOverview.cpu.usage * 0.3)))
    )

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eclean System Report - ${dateStr}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e2e8f0;
      padding: 40px;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .header h1 {
      font-size: 28px;
      background: linear-gradient(135deg, #3b82f6, #22d3ee);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .header .date { color: rgba(255,255,255,0.4); font-size: 14px; }
    .health-score {
      text-align: center;
      margin: 30px 0;
    }
    .health-score .score {
      font-size: 64px;
      font-weight: 800;
      background: linear-gradient(135deg, ${healthScore >= 70 ? '#22c55e, #16a34a' : healthScore >= 40 ? '#f59e0b, #d97706' : '#ef4444, #dc2626'});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .health-score .label { color: rgba(255,255,255,0.5); font-size: 14px; }
    .section {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .section h2 {
      font-size: 16px;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-item {
      background: rgba(255,255,255,0.02);
      border-radius: 10px;
      padding: 14px;
    }
    .info-item .label { color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 4px; }
    .info-item .value { color: #fff; font-size: 15px; font-weight: 500; }
    .bar-container {
      width: 100%;
      height: 8px;
      background: rgba(255,255,255,0.05);
      border-radius: 4px;
      margin-top: 8px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }
    .bar-fill.green { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .bar-fill.yellow { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .bar-fill.red { background: linear-gradient(90deg, #ef4444, #dc2626); }
    .bar-fill.blue { background: linear-gradient(90deg, #3b82f6, #22d3ee); }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table th, table td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    table th { color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 500; text-transform: uppercase; }
    table td { color: #e2e8f0; font-size: 14px; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge.healthy { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge.warning { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge.unhealthy { background: rgba(239,68,68,0.15); color: #ef4444; }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.25);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>eclean System Report</h1>
      <div class="date">Generated on ${dateStr} at ${timeStr}</div>
    </div>

    <div class="health-score">
      <div class="score">${healthScore}</div>
      <div class="label">Health Score</div>
    </div>

    <!-- System Overview -->
    <div class="section">
      <h2>System Overview</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">CPU Usage</div>
          <div class="value">${systemOverview.cpu.usage}%</div>
          <div class="bar-container">
            <div class="bar-fill ${systemOverview.cpu.usage > 80 ? 'red' : systemOverview.cpu.usage > 50 ? 'yellow' : 'green'}" style="width: ${systemOverview.cpu.usage}%"></div>
          </div>
        </div>
        <div class="info-item">
          <div class="label">RAM Usage</div>
          <div class="value">${systemOverview.ram.used} / ${systemOverview.ram.total} GB (${ramPercent}%)</div>
          <div class="bar-container">
            <div class="bar-fill ${ramPercent > 80 ? 'red' : ramPercent > 60 ? 'yellow' : 'green'}" style="width: ${ramPercent}%"></div>
          </div>
        </div>
        <div class="info-item">
          <div class="label">Disk Usage</div>
          <div class="value">${systemOverview.disk.used} / ${systemOverview.disk.total} GB (${diskPercent}%)</div>
          <div class="bar-container">
            <div class="bar-fill ${diskPercent > 85 ? 'red' : diskPercent > 70 ? 'yellow' : 'green'}" style="width: ${diskPercent}%"></div>
          </div>
        </div>
        <div class="info-item">
          <div class="label">GPU</div>
          <div class="value">${systemOverview.gpu.name}</div>
        </div>
      </div>
    </div>

    <!-- Hardware -->
    <div class="section">
      <h2>Hardware Details</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">CPU</div>
          <div class="value">${hardwareInfo.cpu.name}</div>
        </div>
        <div class="info-item">
          <div class="label">Cores / Threads</div>
          <div class="value">${hardwareInfo.cpu.cores} cores / ${hardwareInfo.cpu.threads} threads</div>
        </div>
        <div class="info-item">
          <div class="label">Clock Speed</div>
          <div class="value">${hardwareInfo.cpu.maxClockMHz} MHz</div>
        </div>
        <div class="info-item">
          <div class="label">Cache</div>
          <div class="value">L2: ${hardwareInfo.cpu.l2CacheKB} KB / L3: ${hardwareInfo.cpu.l3CacheKB} KB</div>
        </div>
      </div>
    </div>

    <!-- GPU -->
    <div class="section">
      <h2>Graphics</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>VRAM</th><th>Driver</th></tr>
        </thead>
        <tbody>
          ${hardwareInfo.gpu
            .map(
              (g) =>
                `<tr><td>${g.name}</td><td>${Math.round(g.vramBytes / 1073741824 * 10) / 10} GB</td><td>${g.driverVersion}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Memory -->
    <div class="section">
      <h2>Memory (${hardwareInfo.ram.totalGB} GB Total)</h2>
      <table>
        <thead>
          <tr><th>Slot</th><th>Capacity</th><th>Speed</th><th>Manufacturer</th></tr>
        </thead>
        <tbody>
          ${hardwareInfo.ram.modules
            .map(
              (m) =>
                `<tr><td>${m.slot}</td><td>${m.capacityGB} GB</td><td>${m.speedMHz} MHz</td><td>${m.manufacturer}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Storage -->
    <div class="section">
      <h2>Storage</h2>
      <table>
        <thead>
          <tr><th>Model</th><th>Size</th><th>Type</th><th>Interface</th></tr>
        </thead>
        <tbody>
          ${hardwareInfo.storage
            .map(
              (s) =>
                `<tr><td>${s.model}</td><td>${Math.round(s.sizeGB)} GB</td><td>${s.mediaType}</td><td>${s.interface}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Disk Health -->
    <div class="section">
      <h2>Disk Health</h2>
      <table>
        <thead>
          <tr><th>Drive</th><th>Status</th><th>Size</th><th>Type</th><th>Failure Predicted</th></tr>
        </thead>
        <tbody>
          ${diskHealth
            .map(
              (d) =>
                `<tr>
                  <td>${d.name}</td>
                  <td><span class="badge ${d.healthStatus.toLowerCase()}">${d.healthStatus}</span></td>
                  <td>${Math.round(d.size / 1073741824)} GB</td>
                  <td>${d.mediaType}</td>
                  <td>${d.predictFailure ? 'Yes' : 'No'}</td>
                </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Network -->
    <div class="section">
      <h2>Network</h2>
      <table>
        <thead>
          <tr><th>Adapter</th><th>MAC</th><th>IP</th><th>DHCP</th></tr>
        </thead>
        <tbody>
          ${hardwareInfo.network
            .map(
              (n) =>
                `<tr><td>${n.name}</td><td>${n.mac}</td><td>${n.ip.join(', ')}</td><td>${n.dhcp ? 'Yes' : 'No'}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Motherboard & OS -->
    <div class="section">
      <h2>System</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">Operating System</div>
          <div class="value">${hardwareInfo.os.name}</div>
        </div>
        <div class="info-item">
          <div class="label">OS Version</div>
          <div class="value">${hardwareInfo.os.version} (Build ${hardwareInfo.os.build})</div>
        </div>
        <div class="info-item">
          <div class="label">Architecture</div>
          <div class="value">${hardwareInfo.os.arch}</div>
        </div>
        <div class="info-item">
          <div class="label">Motherboard</div>
          <div class="value">${hardwareInfo.motherboard.manufacturer} ${hardwareInfo.motherboard.model}</div>
        </div>
        <div class="info-item">
          <div class="label">BIOS</div>
          <div class="value">${hardwareInfo.motherboard.biosVersion}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Generated by eclean System Optimizer
    </div>
  </div>
</body>
</html>`

    const fileName = `eclean-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.html`
    const documentsPath = app.getPath('documents')
    const reportPath = join(documentsPath, fileName)
    writeFileSync(reportPath, html, 'utf-8')

    return { path: reportPath, success: true }
  } catch (e: any) {
    console.error('Report generation failed:', e)
    return { path: '', success: false }
  }
}

export async function generateAndOpenReport(): Promise<{ path: string; success: boolean }> {
  const result = await generateReport()
  if (result.success) {
    shell.openPath(result.path)
  }
  return result
}
