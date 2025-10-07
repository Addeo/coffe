#!/bin/bash

# VM Management Script
# Управление виртуальной машиной SberCloud с Docker контейнерами
# Usage: ./vm-manage.sh [command] [vm_ip] [ssh_key_path]

set -e

COMMAND=${1:-"status"}
VM_IP=${2:-"your-sbercloud-vm-ip"}
SSH_KEY=${3:-"~/.ssh/id_ed25519"}
REMOTE_USER=${4:-"ubuntu"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[COMMAND]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

show_help() {
    echo "VM Management Script for Coffee Admin"
    echo ""
    echo "Usage: $0 <command> [vm_ip] [ssh_key_path]"
    echo ""
    echo "Commands:"
    echo "  status          Show VM and containers status"
    echo "  logs            Show container logs"
    echo "  restart         Restart all containers"
    echo "  backup          Create manual backup"
    echo "  monitor         Show system monitoring info"
    echo "  cleanup         Clean up old backups and logs"
    echo "  ssh             Open SSH session to VM"
    echo "  update          Update application (pull latest images)"
    echo "  help            Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 status 192.168.1.100 ~/.ssh/id_ed25519"
    echo "  $0 logs"
    echo "  $0 backup"
}

cmd_status() {
    print_header "Checking VM Status"

    echo "🔍 VM Information:"
    ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
echo "📊 System Info:"
echo "  • Hostname: $(hostname)"
echo "  • Uptime: $(uptime -p)"
echo "  • Load: $(uptime | awk -F'load average:' '{ print $2 }')"
echo ""
echo "💾 Disk Usage:"
df -h / | tail -1 | awk '{print "  • Root: " $5 " used (" $3 "/" $2 ")"}'
echo ""
echo "🐳 Docker Containers:"
if command -v docker-compose &> /dev/null && [ -f "docker-compose.prod.yml" ]; then
    docker-compose -f docker-compose.prod.yml ps
else
    echo "  • Docker Compose not configured"
fi
echo ""
echo "🔄 Running Processes:"
ps aux | grep -E "(node|nginx|mysql|docker)" | grep -v grep | head -5 || echo "  • No application processes found"
EOF

    echo ""
    echo "🌐 Application Health:"
    if curl -f -s http://$VM_IP:3001/api/test/health > /dev/null 2>&1; then
        echo -e "  ✅ Backend API: ${GREEN}Healthy${NC}"
    else
        echo -e "  ❌ Backend API: ${RED}Unhealthy${NC}"
    fi

    if curl -f -s http://$VM_IP:4000 > /dev/null 2>&1; then
        echo -e "  ✅ Frontend SSR: ${GREEN}Healthy${NC}"
    else
        echo -e "  ❌ Frontend SSR: ${RED}Unhealthy${NC}"
    fi
}

cmd_logs() {
    print_header "Showing Container Logs"

    local SERVICE=${2:-"backend"}

    case $SERVICE in
        backend)
            ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "docker-compose -f docker-compose.prod.yml logs -f --tail=100 backend" 2>/dev/null || \
            print_error "Failed to get backend logs"
            ;;
        frontend)
            ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "docker-compose -f docker-compose.prod.yml logs -f --tail=100 frontend" 2>/dev/null || \
            print_error "Failed to get frontend logs"
            ;;
        mysql)
            ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "docker-compose -f docker-compose.prod.yml logs -f --tail=100 mysql" 2>/dev/null || \
            print_error "Failed to get MySQL logs"
            ;;
        all)
            ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "docker-compose -f docker-compose.prod.yml logs -f --tail=50" 2>/dev/null || \
            print_error "Failed to get all logs"
            ;;
        *)
            print_error "Invalid service. Use: backend, frontend, mysql, or all"
            exit 1
            ;;
    esac
}

cmd_restart() {
    print_header "Restarting Containers"

    local SERVICE=${2:-"all"}

    ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << EOF
echo "🔄 Restarting $SERVICE..."
if [ "$SERVICE" = "all" ]; then
    docker-compose -f docker-compose.prod.yml restart
else
    docker-compose -f docker-compose.prod.yml restart $SERVICE
fi
echo "⏳ Waiting for services to start..."
sleep 10
docker-compose -f docker-compose.prod.yml ps
EOF

    print_success "Containers restarted"
}

cmd_backup() {
    print_header "Creating Manual Backup"

    ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
echo "💾 Creating database backup..."
~/scripts/create-backup.sh

echo ""
echo "📂 Backup files:"
ls -la ~/backups/coffee_backup_*.sql | tail -5

echo ""
echo "📊 Backup statistics:"
echo "  • Total backups: $(ls ~/backups/coffee_backup_*.sql 2>/dev/null | wc -l)"
echo "  • Total size: $(du -sh ~/backups/ 2>/dev/null | cut -f1)"
EOF

    print_success "Backup created"
}

cmd_monitor() {
    print_header "System Monitoring"

    ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
echo "📊 System Resources:"
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "  • CPU Idle: " 100 - $1 "%"}'

echo ""
echo "Memory Usage:"
free -h | grep "^Mem:" | awk '{print "  • Used: " $3 "/" $2 " (" int($3/$2*100) "%)"}'

echo ""
echo "Disk Usage:"
df -h | grep -E "^/dev/" | awk '{print "  • " $1 ": " $5 " used (" $3 "/" $2 ")"}'

echo ""
echo "🐳 Docker Resources:"
if command -v docker &> /dev/null; then
    echo "Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -10
    echo ""
    echo "Docker disk usage:"
    docker system df 2>/dev/null || echo "  • Docker stats not available"
else
    echo "  • Docker not installed"
fi

echo ""
echo "🔥 Active Connections:"
netstat -tuln 2>/dev/null | grep LISTEN | wc -l | awk '{print "  • Listening ports: " $1}'

echo ""
echo "📋 Recent System Logs:"
echo "Last 10 lines from syslog:"
tail -10 /var/log/syslog 2>/dev/null || tail -10 /var/log/messages 2>/dev/null || echo "  • System logs not accessible"
EOF
}

cmd_cleanup() {
    print_header "Cleaning Up Old Files"

    ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
echo "🧹 Running backup cleanup..."
~/scripts/cleanup-backups.sh

echo ""
echo "🗑️ Cleaning up Docker..."
docker system prune -f

echo ""
echo "📂 Current backup status:"
echo "  • Total backups: $(ls ~/backups/coffee_backup_*.sql 2>/dev/null | wc -l)"
echo "  • Total size: $(du -sh ~/backups/ 2>/dev/null | cut -f1)"
echo "  • Disk free: $(df -h / | tail -1 | awk '{print $4}')"
EOF

    print_success "Cleanup completed"
}

cmd_ssh() {
    print_header "Opening SSH Session"
    ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP"
}

cmd_update() {
    print_header "Updating Application"

    ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
echo "⬇️ Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

echo ""
echo "🔄 Recreating containers..."
docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "⏳ Waiting for application to start..."
sleep 30

echo ""
echo "🔍 Checking application status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Update completed!"
EOF

    print_success "Application updated"
}

# Main command dispatcher
case $COMMAND in
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "$@"
        ;;
    restart)
        cmd_restart "$@"
        ;;
    backup)
        cmd_backup
        ;;
    monitor)
        cmd_monitor
        ;;
    cleanup)
        cmd_cleanup
        ;;
    ssh)
        cmd_ssh
        ;;
    update)
        cmd_update
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
