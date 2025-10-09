#!/bin/bash
# Скрипт проверки деплоя на VPS

VPS_IP="192.144.12.102"
VPS_USER="user1"

echo "════════════════════════════════════════════════════════════"
echo "  🔍 ПРОВЕРКА ДЕПЛОЯ НА VPS"
echo "════════════════════════════════════════════════════════════"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки
check_step() {
    local step_name=$1
    local command=$2
    
    echo -n "Проверка: $step_name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# ════════════════════════════════════════════════════════════
echo "1️⃣  ЛОКАЛЬНЫЕ ФАЙЛЫ"
echo "────────────────────────────────────────────────────────────"

check_step "GitHub Actions workflow" "test -f .github/workflows/deploy-vps.yml"
check_step "Docker Compose prod" "test -f docker-compose.prod.yml"
check_step "Backend Dockerfile" "test -f backend/Dockerfile"
check_step "Frontend Dockerfile" "test -f frontend/Dockerfile"

echo ""

# ════════════════════════════════════════════════════════════
echo "2️⃣  ПОДКЛЮЧЕНИЕ К VPS"
echo "────────────────────────────────────────────────────────────"

if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'connected'" > /dev/null 2>&1; then
    echo -e "SSH подключение: ${GREEN}✅ OK${NC}"
    VPS_CONNECTED=true
else
    echo -e "SSH подключение: ${RED}❌ FAILED${NC}"
    echo "  Попробуйте: ssh $VPS_USER@$VPS_IP"
    VPS_CONNECTED=false
fi

echo ""

# ════════════════════════════════════════════════════════════
if [ "$VPS_CONNECTED" = true ]; then
    echo "3️⃣  ПРОВЕРКА VPS"
    echo "────────────────────────────────────────────────────────────"
    
    # Docker установлен?
    if ssh -o ConnectTimeout=5 $VPS_USER@$VPS_IP "docker --version" > /dev/null 2>&1; then
        DOCKER_VERSION=$(ssh $VPS_USER@$VPS_IP "docker --version")
        echo -e "Docker установлен: ${GREEN}✅ $DOCKER_VERSION${NC}"
    else
        echo -e "Docker установлен: ${RED}❌ НЕТ${NC}"
        echo "  Выполните на VPS: sudo apt install -y docker.io"
    fi
    
    # Docker Compose установлен?
    if ssh -o ConnectTimeout=5 $VPS_USER@$VPS_IP "docker-compose --version" > /dev/null 2>&1; then
        COMPOSE_VERSION=$(ssh $VPS_USER@$VPS_IP "docker-compose --version")
        echo -e "Docker Compose установлен: ${GREEN}✅ $COMPOSE_VERSION${NC}"
    else
        echo -e "Docker Compose установлен: ${RED}❌ НЕТ${NC}"
        echo "  Выполните на VPS: sudo apt install -y docker-compose"
    fi
    
    # Директория проекта существует?
    if ssh -o ConnectTimeout=5 $VPS_USER@$VPS_IP "test -d ~/coffe" > /dev/null 2>&1; then
        echo -e "Директория ~/coffe: ${GREEN}✅ СУЩЕСТВУЕТ${NC}"
    else
        echo -e "Директория ~/coffe: ${YELLOW}⚠️  НЕТ${NC}"
        echo "  Будет создана при первом деплое"
    fi
    
    echo ""
    
    # ════════════════════════════════════════════════════════════
    echo "4️⃣  ПРОВЕРКА КОНТЕЙНЕРОВ (если уже задеплоено)"
    echo "────────────────────────────────────────────────────────────"
    
    # Проверка контейнеров
    if ssh -o ConnectTimeout=5 $VPS_USER@$VPS_IP "cd ~/coffe && docker-compose -f docker-compose.prod.yml ps" > /dev/null 2>&1; then
        echo "Контейнеры на VPS:"
        ssh $VPS_USER@$VPS_IP "cd ~/coffe && docker-compose -f docker-compose.prod.yml ps" 2>/dev/null || echo "  Контейнеры ещё не запущены"
    else
        echo -e "${YELLOW}⚠️  Контейнеры ещё не запущены (это нормально до первого деплоя)${NC}"
    fi
    
    echo ""
fi

# ════════════════════════════════════════════════════════════
echo "5️⃣  ПРОВЕРКА СЕРВИСОВ"
echo "────────────────────────────────────────────────────────────"

# Backend API
echo -n "Backend API (http://$VPS_IP:3001/api/test) ... "
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$VPS_IP:3001/api/test" | grep -q "200\|401"; then
    echo -e "${GREEN}✅ РАБОТАЕТ${NC}"
else
    echo -e "${YELLOW}⚠️  НЕ ДОСТУПЕН (запустится после деплоя)${NC}"
fi

# Frontend
echo -n "Frontend (http://$VPS_IP:4000) ... "
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$VPS_IP:4000" | grep -q "200"; then
    echo -e "${GREEN}✅ РАБОТАЕТ${NC}"
else
    echo -e "${YELLOW}⚠️  НЕ ДОСТУПЕН (запустится после деплоя)${NC}"
fi

echo ""

# ════════════════════════════════════════════════════════════
echo "6️⃣  GIT СТАТУС"
echo "────────────────────────────────────────────────────────────"

# Проверка, что есть изменения для коммита
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  Нет файлов для коммита${NC}"
    echo "  Добавьте файлы: git add ."
else
    echo -e "${GREEN}✅ Файлы готовы к коммиту${NC}"
    echo ""
    echo "Файлы для коммита:"
    git diff --cached --name-only | sed 's/^/  - /'
fi

echo ""

# ════════════════════════════════════════════════════════════
echo "═══════════════════════════════════════════════════════════"
echo "  📋 СЛЕДУЮЩИЕ ШАГИ"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$VPS_CONNECTED" = false ]; then
    echo "🔴 СНАЧАЛА:"
    echo "   1. Настройте VPS (см. START_HERE.md шаг 1)"
    echo "   2. Выполните: ssh user1@192.144.12.102"
    echo ""
fi

if git diff --cached --quiet; then
    echo "🟡 ЗАТЕМ:"
    echo "   1. Добавьте файлы: git add ."
    echo "   2. Сделайте коммит: git commit -m 'Deploy to VPS'"
    echo "   3. Запушьте: git push origin main"
else
    echo "🟢 ГОТОВО К ДЕПЛОУ!"
    echo "   Выполните:"
    echo "   1. git commit -m 'Deploy to VPS'"
    echo "   2. git push origin main"
    echo "   3. Проверьте: https://github.com/Addeo/coffe-deploy/actions"
fi

echo ""
echo "После деплоя приложение будет доступно:"
echo "  🌐 Frontend: http://192.144.12.102:4000"
echo "  🔗 Backend:  http://192.144.12.102:3001/api"
echo ""
echo "════════════════════════════════════════════════════════════"

