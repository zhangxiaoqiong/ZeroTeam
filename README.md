# 🤖 AI团队事务清单 - 可与 OpenClaw 集成

一个支持任务管理并可与 OpenClaw 自动化集成的 Web 应用。

## 功能特性

- ✅ 任务管理：添加、编辑、删除任务
- ✅ 标记完成
- ✅ 任务属性：标题、描述、截止日期、优先级、分类
- ✅ 筛选功能：按状态、优先级、分类筛选
- ✅ 统计数据
- ✅ 暗黑模式
- ✅ **与 OpenClaw 集成**：自动执行任务

## 快速开始

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

在浏览器中访问 http://localhost:8080/index.html

或者如果代理开启，直接访问 http://localhost:3001

## OpenClaw 集成

### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/todos` | GET | 获取所有任务 |
| `/api/todos` | POST | 创建任务 |
| `/api/todos/:id` | PUT | 更新任务 |
| `/api/todos/:id` | DELETE | 删除任务 |
| `/api/todos/:id/complete` | PATCH | 标记完成 |
| `/api/stats` | GET | 统计数据 |
| `/api/openclaw/pending-tasks` | GET | **OpenClaw 专用：获取待执行任务** |

### CLI 工具

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

### 在 OpenClaw 中使用

你可以在 OpenClaw 的 Heartbeat 或 Cron 任务中调用：

```bash
# 获取待执行任务
curl http://localhost:3001/api/openclaw/pending-tasks

# 或者使用 CLI
~/Projects/todo-app/todo-cli.sh list
```

## 技术栈

- **前端**: HTML/CSS/JavaScript (原生)
- **后端**: Node.js + Express
- **数据库**: SQLite (better-sqlite3)

## 文件结构

```
todo-app/
├── index.html      # 前端页面
├── server.js       # 后端 API 服务
├── package.json    # Node.js 依赖
├── todos.db        # SQLite 数据库（自动创建）
├── todo-cli.sh     # CLI 工具
└── README.md       # 本文件
```
