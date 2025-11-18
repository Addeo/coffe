#!/bin/bash
# Server Maintenance Script
# Run this on the server: ssh user1@192.144.12.102 'bash -s' < server-maintenance.sh

echo "🔍 Server Maintenance Report"
echo "============================="
echo ""

echo "💾 Disk Usage:"
df -h /
echo ""

echo "📂 Project Directory Size:"
du -sh ~/coffe
echo ""

echo "📊 Top 10 largest directories:"
du -h ~/coffe | sort -rh | head -10
echo ""

echo "🗑️  Backup Directory:"
du -sh ~/coffe/backups 2>/dev/null || echo "No backups directory"
echo ""

echo "🐳 Docker Disk Usage:"
docker system df
echo ""

echo "📦 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "🧹 Cleanup Options:"
echo "  - Clean backups: rm -rf ~/coffe/backups/*"
echo "  - Docker prune: docker system prune -af"
echo "  - Clean logs: truncate -s 0 ~/coffe/backend/server.log"
