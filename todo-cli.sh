#!/bin/bash
# OpenClaw Todo 集成脚本
# 用法: 
#   ./todo-cli.sh list          - 列出所有待办任务
#   ./todo-cli.sh get<id>     -  获取任务详情
#   ./todo-cli.sh complete <id> - 标记任务完成

API_URL="http://localhost:3001/api"

case "$1" in
  list)
    echo "📋 待执行任务列表:"
    echo "===================="
    curl -s "$API_URL/openclaw/pending-tasks" | jq -r '.[] | "[\(.priority)] #\(.id) - \(.title)\n       分类: \(.category // "无") | 截止: \(.due // "无")\n"'
    ;;
  get)
    if [ -z "$2" ]; then
      echo "用法: $0 get <任务ID>"
      exit 1
    fi
    curl -s "$API_URL/todos/$2" | jq '.'
    ;;
  complete)
    if [ -z "$2" ]; then
      echo "用法: $0 complete <任务ID>"
      exit 1
    fi
    curl -s -X PATCH "$API_URL/todos/$2/complete" \
      -H "Content-Type: application/json" \
      -d '{"completed": true}'
    echo "✅ 任务已完成"
    ;;
  add)
    shift
    TITLE="$1"
    DESC="$2"
    PRIORITY="${3:-medium}"
    CATEGORY="$4"
    
    if [ -z "$TITLE" ]; then
      echo "用法: $0 add <标题> [描述] [优先级] [分类]"
      exit 1
    fi
    
    curl -s -X POST "$API_URL/todos" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"$TITLE\",\"description\":\"$DESC\",\"priority\":\"$PRIORITY\",\"category\":\"$CATEGORY\"}"
    echo "✅ 任务已添加"
    ;;
  stats)
    curl -s "$API_URL/stats" | jq '.'
    ;;
  *)
    echo "OpenClaw Todo CLI"
    echo "================="
    echo "用法: $0 <命令> [参数]"
    echo ""
    echo "命令:"
    echo "  list              - 列出所有待办任务"
    echo "  get <id>          - 获取任务详情"
    echo "  add <标题> [描述] [优先级] [分类] - 添加新任务"
    echo "  complete <id>     - 标记任务完成"
    echo "  stats             - 显示统计信息"
    ;;
esac
