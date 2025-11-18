#!/bin/bash

# ============================================
# Deploy with Fallback Script
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
VPS_PATH="/root/coffe"
BACKUP_DIR="backups-$(date +%Y%m%d_%H%M%S)"
MAX_RETRIES=3
HEALTH_CHECK_TIMEOUT=60

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy with Fallback Mechanism                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print colored output
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

# Function to check if service is healthy
check_service_health() {
    local service=$1
    local url=$2
    local timeout=${3:-30}
    
    print_step "Checking $service health..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f --max-time $timeout "$url" &> /dev/null; then
            print_status "$service is healthy"
            return 0
        else
            retries=$((retries + 1))
            print_warning "$service health check failed (attempt $retries/$MAX_RETRIES)"
            sleep 5
        fi
    done
    
    print_error "$service is not responding after $MAX_RETRIES attempts"
    return 1
}

# Function to create backup on remote server
create_remote_backup() {
    local service=$1
    local remote_path=$2
    
    print_step "Creating backup for $service on remote server..."
    
    ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
        cd ${remote_path}
        mkdir -p backups
        
        # Backup current version if exists
        if [ -d "dist" ]; then
            echo "Creating backup of current dist..."
            cp -r dist backups/dist.backup-$(date +%Y%m%d_%H%M%S)
        fi
        
        if [ -d "node_modules" ]; then
            echo "Creating backup of current node_modules..."
            cp -r node_modules backups/node_modules.backup-$(date +%Y%m%d_%H%M%S)
        fi
        
        # Keep only last 5 backups
        cd backups
        ls -t | grep "\.backup-" | tail -n +6 | xargs -r rm -rf
        
        echo "Backup created successfully"
ENDSSH
    
    print_status "Remote backup created"
}

# Function to restore from backup on remote server
restore_remote_backup() {
    local service=$1
    local remote_path=$2
    
    print_step "Restoring $service from backup on remote server..."
    
    ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
        cd ${remote_path}/backups
        
        # Find the most recent backup
        LATEST_BACKUP=\$(ls -t | grep "\.backup-" | head -n 1)
        
        if [ -n "\$LATEST_BACKUP" ]; then
            echo "Restoring from backup: \$LATEST_BACKUP"
            
            # Remove current dist if exists
            if [ -d "../dist" ]; then
                rm -rf ../dist
            fi
            
            # Restore from backup
            cp -r "\$LATEST_BACKUP" ../dist
            
            echo "Backup restored successfully"
        else
            echo "No backup found to restore"
            exit 1
        fi
ENDSSH
    
    print_status "Remote backup restored"
}

# Function to deploy with fallback
deploy_with_fallback() {
    local service=$1
    local build_command=$2
    local health_url=$3
    local remote_path=$4
    
    print_step "Deploying $service with fallback mechanism..."
    
    # Step 1: Create backup on remote server
    create_remote_backup "$service" "$remote_path"
    
    # Step 2: Try to build locally
    print_step "Building $service locally..."
    if eval "$build_command"; then
        print_status "$service build successful"
    else
        print_error "$service build failed"
        return 1
    fi
    
    # Step 3: Copy files to remote server
    print_step "Copying files to remote server..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.env' \
        --exclude 'database.sqlite' \
        --exclude 'uploads' \
        ./ ${VPS_USER}@${VPS_HOST}:${remote_path}/
    
    print_status "Files copied to remote server"
    
    # Step 4: Build on remote server
    print_step "Building $service on remote server..."
    ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
        cd ${remote_path}
        
        # Install dependencies
        npm install --production
        
        # Try to build
        if npm run build; then
            echo "Build successful on remote server"
        else
            echo "Build failed on remote server, restoring from backup..."
            restore_remote_backup "$service" "$remote_path"
        fi
ENDSSH
    
    # Step 5: Restart service
    print_step "Restarting $service..."
    ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
        cd ${remote_path}
        
        # Try to restart with PM2
        if command -v pm2 &> /dev/null; then
            echo "Restarting with PM2..."
            pm2 restart coffee-backend || pm2 start dist/main.js --name coffee-backend
        elif command -v docker &> /dev/null; then
            echo "Restarting with Docker..."
            docker restart coffee-backend-1 || docker-compose restart backend
        else
            echo "Starting with npm..."
            pkill -f "node.*dist/main" || true
            npm run start:prod &
        fi
        
        echo "Service restarted"
ENDSSH
    
    # Step 6: Health check
    print_step "Performing health check..."
    sleep 10  # Give service time to start
    
    if check_service_health "$service" "$health_url" "$HEALTH_CHECK_TIMEOUT"; then
        print_status "$service deployment successful"
        return 0
    else
        print_error "$service health check failed after deployment"
        
        # Try to restore from backup
        print_step "Attempting to restore from backup..."
        restore_remote_backup "$service" "$remote_path"
        
        # Restart service again
        ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
            cd ${remote_path}
            
            if command -v pm2 &> /dev/null; then
                pm2 restart coffee-backend
            elif command -v docker &> /dev/null; then
                docker restart coffee-backend-1
            else
                pkill -f "node.*dist/main" || true
                npm run start:prod &
            fi
ENDSSH
        
        # Final health check
        sleep 10
        if check_service_health "$service" "$health_url" "$HEALTH_CHECK_TIMEOUT"; then
            print_status "$service restored from backup and working"
            return 0
        else
            print_error "$service is still not working after restore"
            return 1
        fi
    fi
}

# Main deployment logic
main() {
    print_step "Starting deployment with fallback mechanism..."
    
    # Check if we're in the right directory
    if [ ! -f "backend/package.json" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Deploy backend
    print_step "Deploying backend..."
    cd backend
    
    if deploy_with_fallback "backend" "npm run build" "http://${VPS_HOST}:3001/api/health" "${VPS_PATH}/backend"; then
        print_status "Backend deployment successful"
    else
        print_error "Backend deployment failed"
        exit 1
    fi
    
    cd ..
    
    # Deploy frontend
    print_step "Deploying frontend..."
    cd frontend
    
    if deploy_with_fallback "frontend" "npm run build" "http://${VPS_HOST}:4000" "${VPS_PATH}/frontend"; then
        print_status "Frontend deployment successful"
    else
        print_error "Frontend deployment failed"
        exit 1
    fi
    
    cd ..
    
    print_status "All services deployed successfully with fallback mechanism"
}

# Run main function
main "$@"
