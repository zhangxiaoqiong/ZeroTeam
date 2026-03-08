const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 初始化数据库
const db = new Database('todos.db');

// 创建增强版表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'general',
    status TEXT DEFAULT 'idle',  -- idle, working, completed, error
    current_task_id INTEGER,
    last_activity TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_task_id) REFERENCES todos(id)
  );

  CREATE TABLE IF NOT EXISTS task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    agent_id INTEGER,
    action TEXT,
    message TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES todos(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  -- 项目表
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 需求表
  CREATE TABLE IF NOT EXISTS requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`);

// ========== Agent 管理 API ==========

// 获取所有 Agent
app.get('/api/agents', (req, res) => {
  const agents = db.prepare(`
    SELECT a.*, t.title as current_task_title 
    FROM agents a 
    LEFT JOIN todos t ON a.current_task_id = t.id
    ORDER BY a.created_at DESC
  `).all();
  res.json(agents);
});

// 注册 Agent
app.post('/api/agents', (req, res) => {
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: 'Agent 名称不能为空' });
  
  try {
    const stmt = db.prepare('INSERT INTO agents (name, role) VALUES (?, ?)');
    const result = stmt.run(name, role || 'general');
    res.json({ id: result.lastInsertRowid, message: 'Agent 注册成功' });
  } catch (e) {
    res.status(400).json({ error: 'Agent 已存在' });
  }
});

// 更新 Agent 状态
app.patch('/api/agents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, task_id } = req.body;
  
  db.prepare(`
    UPDATE agents 
    SET status = ?, current_task_id = ?, last_activity = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, task_id || null, id);
  
  res.json({ message: '状态更新成功' });
});

// Agent 签到/心跳
app.post('/api/agents/:name/heartbeat', (req, res) => {
  const { name } = req.params;
  const { status, task_id, message } = req.body;
  
  let agent = db.prepare('SELECT * FROM agents WHERE name = ?').get(name);
  
  if (!agent) {
    // 自动注册
    const result = db.prepare('INSERT INTO agents (name, status) VALUES (?, ?)').run(name, status || 'idle');
    agent = { id: result.lastInsertRowid, name, status: status || 'idle' };
  }
  
  // 更新状态
  db.prepare(`
    UPDATE agents 
    SET status = COALESCE(?, status), 
        current_task_id = COALESCE(?, current_task_id),
        last_activity = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, task);
  
  //_id, agent.id 记录日志
  if (message) {
    db.prepare(`
      INSERT INTO task_logs (agent_id, action, message) VALUES (?, ?, ?)
    `).run(agent.id, 'heartbeat', message);
  }
  
  res.json({ agent, message: '心跳已记录' });
});

// 获取 Agent 日志
app.get('/api/agents/:id/logs', (req, res) => {
  const { id } = req.params;
  const logs = db.prepare(`
    SELECT l.*, a.name as agent_name, t.title as task_title
    FROM task_logs l
    LEFT JOIN agents a ON l.agent_id = a.id
    LEFT JOIN todos t ON l.task_id = t.id
    WHERE l.agent_id = ?
    ORDER BY l.timestamp DESC
    LIMIT 50
  `).all(id);
  res.json(logs);
});

// ========== 任务管理 API（保持原有） ==========

// 获取所有任务
app.get('/api/todos', (req, res) => {
  const { status, priority, category, assignee, project_id } = req.query;
  let sql = 'SELECT * FROM todos WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (assignee) { sql += ' AND assignee = ?'; params.push(assignee); }
  if (project_id) { sql += ' AND project_id = ?'; params.push(project_id); }

  sql += ' ORDER BY created_at DESC';
  const todos = db.prepare(sql).all(...params);
  res.json(todos);
});

// 添加任务
app.post('/api/todos', (req, res) => {
  const { title, description, due, priority, category, assignee, project_id, planned_start, planned_end, actual_start, actual_end } = req.body;
  if (!title) return res.status(400).json({ error: '标题不能为空' });

  const stmt = db.prepare(`
    INSERT INTO todos (title, description, due, priority, category, assignee, project_id, planned_start, planned_end, actual_start, actual_end, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);
  const result = stmt.run(title, description || '', due || '', priority || 'medium', category || '', assignee || '', project_id || null, planned_start || '', planned_end || '', actual_start || '', actual_end || '');
  
  res.json({ id: result.lastInsertRowid, message: '任务创建成功' });
});

// 更新任务
app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, due, priority, category, assignee, status, project_id, planned_start, planned_end, actual_start, actual_end } = req.body;

  const stmt = db.prepare(`
    UPDATE todos 
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        due = COALESCE(?, due),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        assignee = COALESCE(?, assignee),
        status = COALESCE(?, status),
        project_id = COALESCE(?, project_id),
        planned_start = COALESCE(?, planned_start),
        planned_end = COALESCE(?, planned_end),
        actual_start = COALESCE(?, actual_start),
        actual_end = COALESCE(?, actual_end),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(title, description, due, priority, category, assignee, status, project_id, planned_start, planned_end, actual_start, actual_end, id);
  res.json({ message: '任务更新成功' });
});

// 删除任务
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  res.json({ message: '任务删除成功' });
});

// 任务状态更新
app.patch('/api/todos/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, execution_result, execution_time } = req.body;
  
  const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';
  
  const stmt = db.prepare(`
    UPDATE todos 
    SET status = ?,
        execution_result = COALESCE(?, execution_result),
        execution_time = COALESCE(?, execution_time),
        completed_at = ${status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL'},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(status, execution_result, execution_time, id);
  res.json({ message: '状态更新成功' });
});

// 标记开始执行
app.patch('/api/todos/:id/start', (req, res) => {
  const { id } = req.params;
  db.prepare(`UPDATE todos SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
  res.json({ message: '任务开始执行' });
});

// 获取统计
app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM todos').get().count;
  const pending = db.prepare('SELECT COUNT(*) as count FROM todos WHERE status = ?').get('pending').count;
  const inProgress = db.prepare('SELECT COUNT(*) as count FROM todos WHERE status = ?').get('in_progress').count;
  const completed = db.prepare('SELECT COUNT(*) as count FROM todos WHERE status = ?').get('completed').count;
  const failed = db.prepare('SELECT COUNT(*) as count FROM todos WHERE status = ?').get('failed').count;
  
  // Agent 统计
  const agentStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM agents GROUP BY status
  `).all();

  res.json({ 
    total, pending, in_progress: inProgress, completed, failed, 
    agents: agentStats 
  });
});

// ========== OpenClaw 专用接口 ==========

// 获取待执行任务
app.get('/api/openclaw/pending-tasks', (req, res) => {
  const tasks = db.prepare(`
    SELECT * FROM todos 
    WHERE status = 'pending'
    ORDER BY 
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      created_at ASC
    LIMIT 10
  `).all();
  res.json(tasks);
});

// 获取分配给特定 Agent 的任务
app.get('/api/openclaw/tasks/:agent', (req, res) => {
  const { agent } = req.params;
  const tasks = db.prepare(`
    SELECT * FROM todos 
    WHERE assignee = ? AND status = 'pending'
    ORDER BY 
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      created_at ASC
  `).all(agent);
  res.json(tasks);
});

// 报告任务执行结果
app.post('/api/openclaw/report', (req, res) => {
  const { task_id, status, result, execution_time, agent_name } = req.body;
  
  db.prepare(`
    UPDATE todos 
    SET status = ?,
        execution_result = ?,
        execution_time = ?,
        completed_at = ${status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL'},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, result, execution_time, task_id);
  
  // 更新 Agent 状态
  if (agent_name) {
    db.prepare(`
      UPDATE agents SET status = 'idle', current_task_id = NULL, last_activity = CURRENT_TIMESTAMP
      WHERE name = ?
    `).run(agent_name);
  }
  
  res.json({ message: '执行结果已记录' });
});

// 分配任务给 Agent
app.post('/api/openclaw/assign', (req, res) => {
  const { task_id, agent_name } = req.body;
  
  // 更新任务状态
  db.prepare(`UPDATE todos SET status = 'in_progress', assignee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(agent_name, task_id);
  
  // 更新 Agent 状态
  db.prepare(`
    UPDATE agents SET status = 'working', current_task_id = ?, last_activity = CURRENT_TIMESTAMP
    WHERE name = ?
  `).run(task_id, agent_name);
  
  // 记录日志
  const agent = db.prepare('SELECT id FROM agents WHERE name = ?').get(agent_name);
  if (agent) {
    db.prepare(`INSERT INTO task_logs (task_id, agent_id, action, message) VALUES (?, ?, ?, ?)`)
      .run(task_id, agent.id, 'assigned', `任务分配给 ${agent_name}`);
  }
  
  res.json({ message: '任务分配成功' });
});

// 团队动态 - 获取所有 Agent 和任务的实时状态
app.get('/api/team/activity', (req, res) => {
  const agents = db.prepare(`
    SELECT a.*, t.title as current_task_title 
    FROM agents a 
    LEFT JOIN todos t ON a.current_task_id = t.id
    ORDER BY a.last_activity DESC
  `).all();
  
  const recentLogs = db.prepare(`
    SELECT l.*, a.name as agent_name, t.title as task_title
    FROM task_logs l
    LEFT JOIN agents a ON l.agent_id = a.id
    LEFT JOIN todos t ON l.task_id = t.id
    ORDER BY l.timestamp DESC
    LIMIT 20
  `).all();
  
  const tasks = db.prepare(`
    SELECT * FROM todos 
    WHERE status IN ('pending', 'in_progress')
    ORDER BY created_at DESC
  `).all();
  
  res.json({ agents, recentLogs, tasks });
});

console.log(`
🤖 AI团队事务清单 + 团队可视化看板
   本地: http://localhost:${PORT}
   
新增功能：
   🤖 Agent 管理与状态追踪
   📊 团队实时动态看板
   📝 任务分配与执行日志
   
API 接口：
   GET  /api/agents                    - 获取所有 Agent
   POST /api/agents                     - 注册 Agent
   PATCH /api/agents/:id/status        - 更新 Agent 状态
   POST /api/agents/:name/heartbeat    - Agent 心跳（自动注册+签到）
   GET  /api/agents/:id/logs           - 获取 Agent 日志
   GET  /api/team/activity             - 团队实时动态
   POST /api/openclaw/assign           - 分配任务给 Agent

   -- 项目管理
   GET  /api/projects                   - 获取所有项目
   POST /api/projects                   - 创建项目
   PUT  /api/projects/:id               - 更新项目
   DELETE /api/projects/:id             - 删除项目

   -- 需求管理
   GET  /api/requirements               - 获取所有需求
   POST /api/requirements               - 创建需求
   PUT  /api/requirements/:id           - 更新需求
   DELETE /api/requirements/:id         - 删除需求

   -- 任务扩展（含时间字段）
   GET  /api/todos                      - 获取所有任务
   POST /api/todos                      - 创建任务
   PUT  /api/todos/:id                  - 更新任务（含时间）
`);

// ========== 项目管理 API ==========

// 获取所有项目
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

// 创建项目
app.post('/api/projects', (req, res) => {
  const { name, description, priority } = req.body;
  const stmt = db.prepare('INSERT INTO projects (name, description, priority) VALUES (?, ?, ?)');
  const result = stmt.run(name, description || '', priority || 'medium');
  res.json({ id: result.lastInsertRowid, name, description, priority });
});

// 更新项目
app.put('/api/projects/:id', (req, res) => {
  const { name, description, status, priority } = req.body;
  const stmt = db.prepare('UPDATE projects SET name=?, description=?, status=?, priority=?, updated_at=CURRENT_TIMESTAMP WHERE id=?');
  stmt.run(name, description, status, priority, req.params.id);
  res.json({ success: true });
});

// 删除项目
app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ========== 需求管理 API ==========

// 获取所有需求
app.get('/api/requirements', (req, res) => {
  const requirements = db.prepare(`
    SELECT r.*, p.name as project_name 
    FROM requirements r 
    LEFT JOIN projects p ON r.project_id = p.id 
    ORDER BY r.created_at DESC
  `).all();
  res.json(requirements);
});

// 创建需求
app.post('/api/requirements', (req, res) => {
  const { project_id, title, description, priority } = req.body;
  const stmt = db.prepare('INSERT INTO requirements (project_id, title, description, priority) VALUES (?, ?, ?, ?)');
  const result = stmt.run(project_id, title, description || '', priority || 'medium');
  res.json({ id: result.lastInsertRowid, project_id, title, description, priority });
});

// 更新需求
app.put('/api/requirements/:id', (req, res) => {
  const { title, description, status, priority } = req.body;
  const stmt = db.prepare('UPDATE requirements SET title=?, description=?, status=?, priority=? WHERE id=?');
  stmt.run(title, description, status, priority, req.params.id);
  res.json({ success: true });
});

// 删除需求
app.delete('/api/requirements/:id', (req, res) => {
  db.prepare('DELETE FROM requirements WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT);
