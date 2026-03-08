# 🤖 ZeroTeam - AI 团队事务管理系统

一个支持任务管理、项目管理、需求管理并可与 OpenClaw 自动化集成的 Web 应用。

![ZeroTeam](https://img.shields.io/badge/Version-1.0.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 功能特性

### 核心功能
- ✅ **任务管理**：添加、编辑、删除任务，支持标题、描述、截止日期、优先级
- ✅ **项目管理**：创建和管理项目，关联任务和需求
- ✅ **需求管理**：需求文档化，关联项目和任务
- ✅ **Agent 管理**：AI Agent 注册、状态追踪、心跳保活

### 任务特性
- 📋 任务属性：标题、描述、截止日期、优先级、分类、负责人
- 🔍 筛选功能：按状态、优先级、分类、负责人筛选
- 📊 统计数据：实时任务统计看板
- 🎨 暗黑模式支持

### OpenClaw 集成
- 🤖 **自动任务执行**：AI Agent 自动领取并执行任务
- 📡 **WebHook 支持**：任务到期自动提醒
- 📈 **团队动态看板**：实时查看所有 Agent 和任务状态

## 🚀 快速开始

### 1. 安装依赖

```bash
cd ~/Projects/todo-app
npm install
```

### 2. 启动后端服务

```bash
npm start
```

服务将在 http://localhost:3001 启动

### 3. 打开前端

| 页面 | 访问地址 | 说明 |
|------|----------|------|
| 任务管理 | http://localhost:3001/index.html | 主任务列表和操作界面 |
| 项目看板 | http://localhost:3001/project.html | 项目和需求管理 |
| 仪表盘 | http://localhost:3001/dashboard.html | 数据统计看板 |

---

## 📚 API 完整文档

### 基础配置

```
Base URL: http://localhost:3001
Content-Type: application/json
```

---

### 1. 任务管理 API

#### 获取所有任务

```http
GET /api/todos
```

**Query Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 筛选状态 (pending/in_progress/completed/failed) |
| priority | string | 筛选优先级 (high/medium/low) |
| category | string | 筛选分类 |
| assignee | string | 筛选负责人 |
| project_id | number | 筛选项目ID |

**Response:**
```json
[
  {
    "id": 1,
    "title": "完成代码审查",
    "description": "Review PR #123",
    "due": "2026-03-15",
    "priority": "high",
    "category": "工作",
    "assignee": "agent-1",
    "status": "pending",
    "created_at": "2026-03-08..."
  }
]
```

#### 创建任务

```http
POST /api/todos
```

**Request Body:**
```json
{
  "title": "任务标题",
  "description": "任务描述",
  "due": "2026-03-15",
  "priority": "high|medium|low",
  "category": "分类名称",
  "assignee": "agent名称",
  "project_id": 1,
  "planned_start": "2026-03-10",
  "planned_end": "2026-03-14"
}
```

#### 更新任务

```http
PUT /api/todos/:id
```

**Request Body:** (所有字段可选)
```json
{
  "title": "新标题",
  "description": "新描述",
  "due": "2026-03-20",
  "priority": "low",
  "category": "新分类",
  "assignee": "新负责人",
  "status": "completed"
}
```

#### 删除任务

```http
DELETE /api/todos/:id
```

#### 更新任务状态

```http
PATCH /api/todos/:id/status
```

**Request Body:**
```json
{
  "status": "pending|in_progress|completed|failed",
  "execution_result": "执行结果描述",
  "execution_time": 120
}
```

#### 标记开始执行

```http
PATCH /api/todos/:id/start
```

#### 获取统计

```http
GET /api/stats
```

**Response:**
```json
{
  "total": 50,
  "pending": 20,
  "in_progress": 5,
  "completed": 23,
  "failed": 2
}
```

---

### 2. Agent 管理 API

#### 获取所有 Agent

```http
GET /api/agents
```

#### 注册 Agent

```http
POST /api/agents
```

**Request Body:**
```json
{
  "name": "agent-1",
  "role": "coder|reviewer|general"
}
```

#### 更新 Agent 状态

```http
PATCH /api/agents/:id/status
```

**Request Body:**
```json
{
  "status": "idle|working|completed|error",
  "task_id": 1
}
```

#### Agent 心跳（自动注册）

```http
POST /api/agents/:name/heartbeat
```

**Request Body:**
```json
{
  "status": "working",
  "task_id": 1,
  "message": "正在处理任务..."
}
```

#### 获取 Agent 日志

```http
GET /api/agents/:id/logs
```

#### Agent 领取任务

```http
POST /api/agents/:name/claim-task
```

#### Agent 完成任务

```http
POST /api/agents/:name/complete-task
```

**Request Body:**
```json
{
  "task_id": 1,
  "result": "任务完成，结果良好"
}
```

#### Agent 报告进度

```http
POST /api/agents/:name/progress
```

**Request Body:**
```json
{
  "task_id": 1,
  "progress": 50,
  "message": "已完成核心功能开发"
}
```

#### 获取 Agent 待办任务

```http
GET /api/agents/:name/pending-tasks
```

---

### 3. 项目管理 API

#### 获取所有项目

```http
GET /api/projects
```

#### 创建项目

```http
POST /api/projects
```

**Request Body:**
```json
{
  "name": "项目名称",
  "description": "项目描述",
  "priority": "high|medium|low"
}
```

#### 更新项目

```http
PUT /api/projects/:id
```

#### 删除项目

```http
DELETE /api/projects/:id
```

---

### 4. 需求管理 API

#### 获取所有需求

```http
GET /api/requirements
```

#### 创建需求

```http
POST /api/requirements
```

**Request Body:**
```json
{
  "project_id": 1,
  "title": "需求标题",
  "description": "需求描述",
  "priority": "high|medium|low"
}
```

#### 更新需求

```http
PUT /api/requirements/:id
```

#### 删除需求

```http
DELETE /api/requirements/:id
```

---

### 5. OpenClaw 专用 API

#### 获取待执行任务

```http
GET /api/openclaw/pending-tasks
```

#### 获取分配给 Agent 的任务

```http
GET /api/openclaw/tasks/:agent
```

#### 报告任务执行结果

```http
POST /api/openclaw/report
```

**Request Body:**
```json
{
  "task_id": 1,
  "status": "completed|failed",
  "result": "执行结果",
  "execution_time": 120,
  "agent_name": "agent-1"
}
```

#### 分配任务给 Agent

```http
POST /api/openclaw/assign
```

**Request Body:**
```json
{
  "task_id": 1,
  "agent_name": "agent-1"
}
```

#### 团队动态（实时看板）

```http
GET /api/team/activity
```

---

## 🖥️ CLI 工具

```bash
# 列出待办任务
./todo-cli.sh list

# 添加任务
./todo-cli.sh add "完成任务A" "描述" "high" "工作"

# 标记完成
./todo-cli.sh complete 1

# 查看统计
./todo-cli.sh stats
```

---

## 🔧 OpenClaw 集成示例

### 在 Heartbeat 中获取待执行任务

```bash
# 获取待执行任务
curl http://localhost:3001/api/openclaw/pending-tasks

# 或者使用 CLI
~/Projects/todo-app/todo-cli.sh list
```

### Agent 任务流程

```bash
# 1. Agent 领取任务
TASK=$(curl -s http://localhost:3001/api/agents/my-agent/pending-tasks | jq '.[0]')
TASK_ID=$(echo $TASK | jq -r '.id')

# 2. 开始执行
curl -X PATCH http://localhost:3001/api/todos/$TASK_ID/start

# 3. 执行任务 (你的任务逻辑)
echo "执行中..."

# 4. 完成任务
curl -X POST http://localhost:3001/api/openclaw/report \
  -H "Content-Type: application/json" \
  -d "{\"task_id\": $TASK_ID, \"status\": \"completed\", \"result\": \"任务完成\", \"execution_time\": 30, \"agent_name\": \"my-agent\"}"
```

### 团队动态监控

```bash
# 获取团队实时状态
curl http://localhost:3001/api/team/activity
```

---

## 📁 项目结构

```
todo-app/
├── index.html          # 任务管理主界面
├── project.html       # 项目和需求管理
├── dashboard.html     # 数据统计看板
├── server.js          # 后端 API 服务
├── package.json       # Node.js 依赖
├── todos.db           # SQLite 数据库（自动创建）
├── todo-cli.sh        # CLI 工具
├── sync-agents.js      # Agent 同步脚本
├── sync-status.js     # 状态同步脚本
└── README.md          # 本文件
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML/CSS/JavaScript (原生) |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |

---

## 📝 数据库表结构

### agents - AI Agent 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | Agent 名称 |
| role | TEXT | 角色 |
| status | TEXT | 状态 (idle/working/completed/error) |
| current_task_id | INTEGER | 当前任务ID |
| last_activity | TEXT | 最后活跃时间 |

### todos - 任务表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| title | TEXT | 任务标题 |
| description | TEXT | 任务描述 |
| status | TEXT | 状态 |
| priority | TEXT | 优先级 |
| category | TEXT | 分类 |
| assignee | TEXT | 负责人 |
| project_id | INTEGER | 项目ID |
| due | TEXT | 截止日期 |
| planned_start | TEXT | 计划开始 |
| planned_end | TEXT | 计划结束 |
| actual_start | TEXT | 实际开始 |
| actual_end | TEXT | 实际结束 |
| execution_result | TEXT | 执行结果 |
| execution_time | INTEGER | 执行耗时(秒) |

### projects - 项目表
### requirements - 需求表
### task_logs - 任务日志表

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
