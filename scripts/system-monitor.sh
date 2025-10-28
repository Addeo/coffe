#!/bin/bash

# ============================================
# System Monitoring Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_HOST=${VPS_HOST:-"192.144.12.102"}
VPS_USER=${VPS_USER:-"root"}
LOG_FILE="/tmp/system-monitor.log"
ALERT_EMAIL=${ALERT_EMAIL:-"admin@example.com"}
CHECK_INTERVAL=${CHECK_INTERVAL:-60}

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
    log "OK: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR: $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO: $1"
}

# Function to check service health
check_service_health() {
    local service=$1
    local url=$2
    local timeout=${3:-10}
    
    if curl -f --max-time $timeout "$url" &> /dev/null; then
        print_status "$service is healthy"
        return 0
    else
        print_error "$service is unhealthy"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local threshold=${1:-80}
    
    print_info "Checking disk space..."
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        # Check disk usage
        DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
        
        if [ "$DISK_USAGE" -gt 80 ]; then
            echo "WARNING: Disk usage is ${DISK_USAGE}%"
            exit 1
        else
            echo "OK: Disk usage is ${DISK_USAGE}%"
            exit 0
        fi
EOF
}

# Function to check memory usage
check_memory_usage() {
    local threshold=${1:-80}
    
    print_info "Checking memory usage..."
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        # Check memory usage
        MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        
        if [ "$MEMORY_USAGE" -gt 80 ]; then
            echo "WARNING: Memory usage is ${MEMORY_USAGE}%"
            exit 1
        else
            echo "OK: Memory usage is ${MEMORY_USAGE}%"
            exit 0
        fi
EOF
}

# Function to check Docker containers
check_docker_containers() {
    print_info "Checking Docker containers..."
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        # Check if containers are running
        CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(coffee_backend|coffee_frontend|coffee_mysql)")
        
        if [ -z "$CONTAINERS" ]; then
            echo "ERROR: No coffee containers found"
            exit 1
        fi
        
        # Check for unhealthy containers
        UNHEALTHY=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -i "unhealthy")
        
        if [ -n "$UNHEALTHY" ]; then
            echo "WARNING: Unhealthy containers found:"
            echo "$UNHEALTHY"
            exit 1
        else
            echo "OK: All containers are healthy"
            exit 0
        fi
EOF
}

# Function to check backup status
check_backup_status() {
    print_info "Checking backup status..."
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        BACKUP_DIR="~/coffe/backups"
        
        if [ ! -d "$BACKUP_DIR" ]; then
            echo "WARNING: Backup directory does not exist"
            exit 1
        fi
        
        # Check if we have recent backups
        RECENT_BACKUP=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime -1 | wc -l)
        
        if [ "$RECENT_BACKUP" -eq 0 ]; then
            echo "WARNING: No recent backups found"
            exit 1
        else
            echo "OK: Found $RECENT_BACKUP recent backup(s)"
            exit 0
        fi
EOF
}

# Function to send alert
send_alert() {
    local message=$1
    local severity=$2
    
    print_error "ALERT: $message"
    
    # Log the alert
    log "ALERT [$severity]: $message"
    
    # Send email alert (if configured)
    if [ -n "$ALERT_EMAIL" ]; then
        echo "Alert: $message" | mail -s "Coffee Admin Alert [$severity]" "$ALERT_EMAIL" || true
    fi
    
    # Send to webhook (if configured)
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Coffee Admin Alert [$severity]: $message\"}" || true
    fi
}

# Function to perform comprehensive health check
comprehensive_health_check() {
    print_info "Starting comprehensive health check..."
    
    local errors=0
    local warnings=0
    
    # Check backend health
    if ! check_service_health "Backend" "http://${VPS_HOST}:3001/api/health"; then
        send_alert "Backend service is not responding" "CRITICAL"
        errors=$((errors + 1))
    fi
    
    # Check frontend health
    if ! check_service_health "Frontend" "http://${VPS_HOST}:4000"; then
        send_alert "Frontend service is not responding" "CRITICAL"
        errors=$((errors + 1))
    fi
    
    # Check disk space
    if ! check_disk_space 80; then
        send_alert "Disk space is running low" "WARNING"
        warnings=$((warnings + 1))
    fi
    
    # Check memory usage
    if ! check_memory_usage 80; then
        send_alert "Memory usage is high" "WARNING"
        warnings=$((warnings + 1))
    fi
    
    # Check Docker containers
    if ! check_docker_containers; then
        send_alert "Docker containers are not healthy" "CRITICAL"
        errors=$((errors + 1))
    fi
    
    # Check backup status
    if ! check_backup_status; then
        send_alert "Backup status is not optimal" "WARNING"
        warnings=$((warnings + 1))
    fi
    
    # Summary
    if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
        print_status "All systems are healthy"
    elif [ $errors -eq 0 ]; then
        print_warning "System is healthy with $warnings warning(s)"
    else
        print_error "System has $errors error(s) and $warnings warning(s)"
        return 1
    fi
    
    return 0
}

# Function to get system status
get_system_status() {
    print_info "Getting system status..."
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        echo "=== System Status ==="
        echo "Date: $(date)"
        echo "Uptime: $(uptime)"
        echo ""
        
        echo "=== Disk Usage ==="
        df -h
        echo ""
        
        echo "=== Memory Usage ==="
        free -h
        echo ""
        
        echo "=== Docker Containers ==="
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        
        echo "=== Recent Logs ==="
        docker logs --tail 10 coffee_backend_fallback 2>/dev/null || echo "Backend logs not available"
        echo ""
        
        echo "=== Backup Status ==="
        ls -la ~/coffe/backups/ 2>/dev/null || echo "No backups found"
EOF
}

# Function to perform automatic recovery
automatic_recovery() {
    print_info "Attempting automatic recovery..."
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        echo "Starting automatic recovery..."
        
        # Check if containers are running
        if ! docker ps | grep -q "coffee_backend_fallback"; then
            echo "Backend container not running, attempting restart..."
            cd ~/coffe
            docker-compose -f docker-compose.fallback.yml up -d backend
        fi
        
        if ! docker ps | grep -q "coffee_frontend_fallback"; then
            echo "Frontend container not running, attempting restart..."
            cd ~/coffe
            docker-compose -f docker-compose.fallback.yml up -d frontend
        fi
        
        # Wait for services to start
        sleep 30
        
        # Check if services are responding
        if curl -f --max-time 10 "http://localhost:3001/api/health" &> /dev/null; then
            echo "Backend recovery successful"
        else
            echo "Backend recovery failed"
        fi
        
        if curl -f --max-time 10 "http://localhost:4000" &> /dev/null; then
            echo "Frontend recovery successful"
        else
            echo "Frontend recovery failed"
        fi
EOF
}

# Function to run continuous monitoring
run_continuous_monitoring() {
    print_info "Starting continuous monitoring (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        if ! comprehensive_health_check; then
            print_warning "Health check failed, attempting recovery..."
            automatic_recovery
            
            # Wait a bit and check again
            sleep 30
            if ! comprehensive_health_check; then
                send_alert "Automatic recovery failed, manual intervention required" "CRITICAL"
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Main function
main() {
    case "${1:-help}" in
        "check")
            comprehensive_health_check
            ;;
        "status")
            get_system_status
            ;;
        "recover")
            automatic_recovery
            ;;
        "monitor")
            run_continuous_monitoring
            ;;
        "help"|*)
            echo "Usage: $0 {check|status|recover|monitor}"
            echo ""
            echo "Commands:"
            echo "  check    - Perform comprehensive health check"
            echo "  status   - Get current system status"
            echo "  recover  - Attempt automatic recovery"
            echo "  monitor  - Run continuous monitoring"
            echo ""
            echo "Environment variables:"
            echo "  VPS_HOST      - VPS hostname (default: 192.144.12.102)"
            echo "  VPS_USER      - VPS username (default: root)"
            echo "  ALERT_EMAIL   - Email for alerts"
            echo "  WEBHOOK_URL   - Webhook URL for alerts"
            echo "  CHECK_INTERVAL - Monitoring interval in seconds (default: 60)"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
