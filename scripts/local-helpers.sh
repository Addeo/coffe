#!/bin/bash

# ============================================
# Local Helper Commands (no SSH required)
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_header() {
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  $1"
  echo "═══════════════════════════════════════════════════════"
  echo ""
}

# Help command
show_help() {
  print_header "Coffee Admin - Local Helper Commands"
  
  cat << 'HELP'
These commands work without SSH connection to the server:

📋 Available Commands:
  help              - Show this help message
  status            - Check local Docker status
  logs              - View local backend logs
  clean-local       - Clean local Docker volumes
  generate-script   - Generate script to run on server
  
🔧 Server Commands (requires manual execution):
  To check disk usage on server:
    1. SSH to server: ssh user1@192.144.12.102
    2. Run: df -h / && du -sh ~/coffe/*
  
  To clean backups on server:
    1. SSH to server: ssh user1@192.144.12.102
    2. Run: cd ~/coffe && rm -rf backups/* && echo "Done"

📦 Docker Commands:
  npm run docker:up      - Start local Docker services
  npm run docker:down    - Stop local Docker services
  npm run docker:logs    - View Docker logs

💡 Tip: Use 'npm run' to see all available commands
HELP
}

# Check local Docker status
check_status() {
  print_header "Local Docker Status"
  
  if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    return 1
  fi
  
  echo "🐳 Docker containers:"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers running"
  
  echo ""
  echo "💾 Docker disk usage:"
  docker system df
}

# View logs
view_logs() {
  print_header "Backend Logs"
  
  if docker ps | grep -q coffee.*backend; then
    echo "📋 Last 50 lines from backend:"
    docker logs --tail 50 $(docker ps -q -f name=backend) 2>&1
  else
    echo "⚠️  Backend container not running"
    echo "Start it with: npm run docker:up"
  fi
}

# Clean local Docker
clean_local() {
  print_header "Clean Local Docker"
  
  echo "⚠️  This will remove all stopped containers, unused networks, and dangling images"
  read -p "Continue? (y/N): " confirm
  
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    docker system prune -f
    echo "✅ Local Docker cleaned"
  else
    echo "Cancelled"
  fi
}

# Generate server maintenance script
generate_script() {
  print_header "Generate Server Maintenance Script"
  
  OUTPUT_FILE="$PROJECT_ROOT/server-maintenance.sh"
  
  cat > "$OUTPUT_FILE" << 'SCRIPT'
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
SCRIPT

  chmod +x "$OUTPUT_FILE"
  
  echo "✅ Script generated: $OUTPUT_FILE"
  echo ""
  echo "To run on server:"
  echo "  1. Upload: scp $OUTPUT_FILE user1@192.144.12.102:~/"
  echo "  2. Execute: ssh user1@192.144.12.102 'bash ~/server-maintenance.sh'"
  echo ""
  echo "Or pipe directly:"
  echo "  ssh user1@192.144.12.102 'bash -s' < $OUTPUT_FILE"
}

# Main
case "${1:-help}" in
  help|--help|-h)
    show_help
    ;;
  status)
    check_status
    ;;
  logs)
    view_logs
    ;;
  clean-local)
    clean_local
    ;;
  generate-script)
    generate_script
    ;;
  *)
    echo "Unknown command: $1"
    echo "Run './scripts/local-helpers.sh help' for available commands"
    exit 1
    ;;
esac

