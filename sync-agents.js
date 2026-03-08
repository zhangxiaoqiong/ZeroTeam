// OpenClaw Agent 自动同步脚本
const { exec } = require('child_process');
const Database = require('better-sqlite3');

const db = new Database('todos.db');

// 从 OpenClaw 获取 agent 列表
function getOpenClawAgents() {
  return new Promise((resolve, reject) => {
    exec('openclaw agents list', (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      
      // 解析输出
      const agents = [];
      const lines = stdout.split('\n');
      let currentAgent = null;
      
      for (const line of lines) {
        const nameMatch = line.match(/^-\s+(\S+)/);
        if (nameMatch) {
          currentAgent = { name: nameMatch[1], role: 'Agent' };
          agents.push(currentAgent);
        }
        
        const workspaceMatch = line.match(/Workspace:\s+(.+)/);
        if (workspaceMatch && currentAgent) {
          currentAgent.workspace = workspaceMatch[1].trim();
        }
        
        const modelMatch = line.match(/Model:\s+(.+)/);
        if (modelMatch && currentAgent) {
          currentAgent.model = modelMatch[1].trim();
        }
      }
      
      resolve(agents);
    });
  });
}

// 同步到数据库
async function syncAgents() {
  try {
    console.log('🔄 正在同步 OpenClaw Agents...');
    const openClawAgents = await getOpenClawAgents();
    
    console.log(`   发现 ${openClawAgents.length} 个 Agents`);
    
    const existing = db.prepare('SELECT name FROM agents').all().map(a => a.name);
    
    for (const agent of openClawAgents) {
      if (!existing.includes(agent.name)) {
        db.prepare('INSERT INTO agents (name, role) VALUES (?, ?)').run(agent.name, agent.role);
        console.log(`   ✅ 新增: ${agent.name}`);
      }
    }
    
    // 按顺序排列：main 在最前面，其他按字母顺序
    openClawAgents.sort((a, b) => {
      if (a.name === 'main') return -1;
      if (b.name === 'main') return 1;
      return a.name.localeCompare(b.name);
    });
    
    // 删除不在 OpenClaw 中的 agents
    const openClawNames = openClawAgents.map(a => a.name);
    for (const name of existing) {
      if (!openClawNames.includes(name)) {
        db.prepare('DELETE FROM agents WHERE name = ?').run(name);
        console.log(`   🗑️ 删除: ${name}`);
      }
    }
    
    console.log('   同步完成');
    return openClawAgents;
  } catch (e) {
    console.error('   ❌ 同步失败:', e.message);
    return [];
  }
}

// 启动时同步一次
console.log('🤖 OpenClaw Agent 同步服务启动');
syncAgents();

// 每60秒同步一次
setInterval(syncAgents, 60000);
