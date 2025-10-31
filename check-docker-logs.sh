#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# VPS connection details (можно заменить на переменные окружения)
VPS_HOST="${VPS_HOST:-192.144.12.102}"
VPS_USER="${VPS_USER:-user1}"
COMPOSE_FILE="docker-compose.fallback.yml"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Docker Logs Viewer for VPS                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check connection
check_connection() {
    if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "echo 'Connected'" 2>/dev/null; then
        echo -e "${RED}❌ Cannot connect to VPS${NC}"
        echo "Check your SSH connection: ssh ${VPS_USER}@${VPS_HOST}"
        exit 1
    fi
}

# Function to list containers
list_containers() {
    echo -e "${CYAN}📋 Available containers:${NC}"
    ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << EOF
        cd ~/coffe 2>/dev/null || cd /home/${VPS_USER}/coffe 2>/dev/null || echo "Directory not found"
        if [ -f ${COMPOSE_FILE} ]; then
            docker compose -f ${COMPOSE_FILE} ps 2>/dev/null || docker-compose -f ${COMPOSE_FILE} ps 2>/dev/null
        else
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "coffee|mysql" || docker ps
        fi
EOF
    echo ""
}

# Main menu
show_menu() {
    echo -e "${YELLOW}Select action:${NC}"
    echo "1) Backend logs (last 50 lines)"
    echo "2) Backend logs (last 100 lines)"
    echo "3) Backend logs (follow - real-time)"
    echo "4) Frontend logs (last 50 lines)"
    echo "5) Frontend logs (last 100 lines)"
    echo "6) Frontend logs (follow - real-time)"
    echo "7) MySQL logs (last 50 lines)"
    echo "8) MySQL logs (follow - real-time)"
    echo "9) All services logs (last 50 lines)"
    echo "10) All services logs (follow - real-time)"
    echo "11) Search for errors in backend logs"
    echo "12) Container status"
    echo "0) Exit"
    echo ""
}

# Execute log command
get_logs() {
    local service=$1
    local lines=$2
    local follow=$3
    
    echo -e "${CYAN}📝 Getting logs for ${service}...${NC}"
    
    ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << EOF
        cd ~/coffe 2>/dev/null || cd /home/${VPS_USER}/coffe 2>/dev/null
        if [ -f ${COMPOSE_FILE} ]; then
            if command -v docker-compose >/dev/null 2>&1; then
                docker-compose -f ${COMPOSE_FILE} logs ${follow} --tail=${lines} ${service}
            else
                docker compose -f ${COMPOSE_FILE} logs ${follow} --tail=${lines} ${service}
            fi
        else
            # Fallback: use container name directly
            container_name=\$(docker ps --format "{{.Names}}" | grep -i "${service}" | head -1)
            if [ -n "\$container_name" ]; then
                docker logs ${follow} --tail=${lines} \$container_name
            else
                echo "Container not found"
            fi
        fi
EOF
}

# Search for errors
search_errors() {
    echo -e "${CYAN}🔍 Searching for errors in backend logs...${NC}"
    ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd ~/coffe 2>/dev/null || cd /home/user1/coffe 2>/dev/null
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose -f docker-compose.fallback.yml logs --tail=500 backend 2>/dev/null | grep -iE "error|exception|failed|fatal" -A 3 -B 3 | tail -50
        else
            docker compose -f docker-compose.fallback.yml logs --tail=500 backend 2>/dev/null | grep -iE "error|exception|failed|fatal" -A 3 -B 3 | tail -50
        fi
EOF
}


# Main script
check_connection
list_containers

while true; do
    show_menu
    read -p "Enter choice [0-12]: " choice
    echo ""
    
    case $choice in
        1)
            get_logs "backend" "50" ""
            ;;
        2)
            get_logs "backend" "100" ""
            ;;
        3)
            echo -e "${YELLOW}Following backend logs (press Ctrl+C to exit)...${NC}"
            get_logs "backend" "50" "-f"
            ;;
        4)
            get_logs "frontend" "50" ""
            ;;
        5)
            get_logs "frontend" "100" ""
            ;;
        6)
            echo -e "${YELLOW}Following frontend logs (press Ctrl+C to exit)...${NC}"
            get_logs "frontend" "50" "-f"
            ;;
        7)
            get_logs "mysql" "50" ""
            ;;
        8)
            echo -e "${YELLOW}Following MySQL logs (press Ctrl+C to exit)...${NC}"
            get_logs "mysql" "50" "-f"
            ;;
        9)
            get_logs "" "50" ""
            ;;
        10)
            echo -e "${YELLOW}Following all logs (press Ctrl+C to exit)...${NC}"
            get_logs "" "50" "-f"
            ;;
        11)
            search_errors
            ;;
        12)
            list_containers
            ;;
        0)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
    list_containers
done

