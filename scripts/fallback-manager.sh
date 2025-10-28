#!/bin/bash

# ============================================
# Fallback Management Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/tmp/builds}"
MAX_BACKUPS=5
LOG_FILE="/tmp/fallback-manager.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
    log "INFO: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR: $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
    log "STEP: $1"
}

# Function to create backup
create_backup() {
    local service=$1
    local source_dir=$2
    
    print_step "Creating backup for $service"
    
    if [ ! -d "$source_dir" ]; then
        print_error "Source directory $source_dir does not exist"
        return 1
    fi
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/${service}_${timestamp}"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Copy source to backup
    cp -r "$source_dir" "$backup_path"
    
    # Create symlink to latest
    ln -sfn "$backup_path" "$BACKUP_DIR/${service}_latest"
    
    # Clean old backups
    cleanup_old_backups "$service"
    
    print_status "Backup created: $backup_path"
    return 0
}

# Function to cleanup old backups
cleanup_old_backups() {
    local service=$1
    
    print_step "Cleaning up old backups for $service"
    
    # Keep only MAX_BACKUPS most recent backups
    cd "$BACKUP_DIR"
    ls -t | grep "^${service}_" | grep -v "_latest$" | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -rf
    
    print_status "Old backups cleaned up"
}

# Function to restore from backup
restore_from_backup() {
    local service=$1
    local target_dir=$2
    
    print_step "Restoring $service from backup"
    
    local latest_backup="$BACKUP_DIR/${service}_latest"
    
    if [ ! -d "$latest_backup" ]; then
        print_error "No backup found for $service"
        return 1
    fi
    
    # Remove target directory if exists
    if [ -d "$target_dir" ]; then
        rm -rf "$target_dir"
    fi
    
    # Copy backup to target
    cp -r "$latest_backup" "$target_dir"
    
    print_status "Restored $service from backup"
    return 0
}

# Function to check service health
check_service_health() {
    local service=$1
    local health_url=$2
    
    print_step "Checking health of $service"
    
    if wget --no-verbose --tries=1 --spider "$health_url" 2>/dev/null; then
        print_status "$service is healthy"
        return 0
    else
        print_warning "$service health check failed"
        return 1
    fi
}

# Function to perform build with fallback
build_with_fallback() {
    local service=$1
    local build_command=$2
    local source_dir=$3
    local health_url=$4
    
    print_step "Building $service with fallback mechanism"
    
    # Try to build
    if eval "$build_command"; then
        print_status "$service build successful"
        
        # Create backup of successful build
        create_backup "$service" "$source_dir"
        
        # Check health
        if check_service_health "$service" "$health_url"; then
            print_status "$service is working correctly"
            return 0
        else
            print_warning "$service build succeeded but health check failed"
            return 1
        fi
    else
        print_error "$service build failed"
        
        # Try to restore from backup
        if restore_from_backup "$service" "$source_dir"; then
            print_status "$service restored from backup"
            
            # Check health of restored version
            if check_service_health "$service" "$health_url"; then
                print_status "$service restored and working"
                return 0
            else
                print_error "$service restored but still not working"
                return 1
            fi
        else
            print_error "No backup available for $service"
            return 1
        fi
    fi
}

# Function to list available backups
list_backups() {
    local service=$1
    
    print_step "Available backups for $service:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_warning "No backup directory found"
        return 1
    fi
    
    cd "$BACKUP_DIR"
    ls -la | grep "^d.*${service}_" | while read -r line; do
        echo "  $line"
    done
}

# Function to force restore
force_restore() {
    local service=$1
    local target_dir=$2
    
    print_step "Force restoring $service"
    
    if restore_from_backup "$service" "$target_dir"; then
        print_status "$service force restored successfully"
        return 0
    else
        print_error "Failed to force restore $service"
        return 1
    fi
}

# Main function
main() {
    case "${1:-help}" in
        "backup")
            create_backup "$2" "$3"
            ;;
        "restore")
            restore_from_backup "$2" "$3"
            ;;
        "build")
            build_with_fallback "$2" "$3" "$4" "$5"
            ;;
        "list")
            list_backups "$2"
            ;;
        "force-restore")
            force_restore "$2" "$3"
            ;;
        "health")
            check_service_health "$2" "$3"
            ;;
        "help"|*)
            echo "Usage: $0 {backup|restore|build|list|force-restore|health} [args...]"
            echo ""
            echo "Commands:"
            echo "  backup <service> <source_dir>     - Create backup"
            echo "  restore <service> <target_dir>    - Restore from backup"
            echo "  build <service> <command> <dir> <health_url> - Build with fallback"
            echo "  list <service>                    - List available backups"
            echo "  force-restore <service> <dir>     - Force restore from backup"
            echo "  health <service> <url>            - Check service health"
            echo ""
            echo "Examples:"
            echo "  $0 backup backend /app/dist"
            echo "  $0 restore backend /app/dist"
            echo "  $0 build backend 'npm run build' /app/dist http://localhost:3001/api/health"
            echo "  $0 list backend"
            echo "  $0 health backend http://localhost:3001/api/health"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
