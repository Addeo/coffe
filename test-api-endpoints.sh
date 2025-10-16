#!/bin/bash

# =============================================================================
# ПРОСТЫЕ ТЕСТЫ API ЭНДПОИНТОВ
# =============================================================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Настройки
BASE_URL="http://localhost:3000"

# Счетчики
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_TESTS++))
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Функция для выполнения HTTP запроса
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    ((TOTAL_TESTS++))
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null -X $method "$BASE_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        log_success "$method $endpoint -> $response ($description)"
        return 0
    else
        log_error "$method $endpoint -> Expected: $expected_status, Got: $response ($description)"
        return 1
    fi
}

# Функция для проверки работоспособности сервера
check_server() {
    log "Проверка работоспособности сервера..."
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/test/health")
    
    if [ "$response" = "200" ]; then
        log_success "Сервер работает"
        return 0
    else
        log_error "Сервер недоступен (HTTP $response)"
        return 1
    fi
}

# Тестирование публичных эндпоинтов
test_public_endpoints() {
    log_info "=== ТЕСТИРОВАНИЕ ПУБЛИЧНЫХ ЭНДПОИНТОВ ==="
    
    test_endpoint "GET" "/test/health" "200" "Health check"
    test_endpoint "GET" "/test" "200" "Test endpoint"
    test_endpoint "GET" "/test/simple" "200" "Simple test"
    test_endpoint "GET" "/test/organizations" "200" "Organizations test"
    test_endpoint "GET" "/test/organizations-static" "200" "Static organizations"
    test_endpoint "GET" "/test/organizations-fixed" "200" "Fixed organizations"
    test_endpoint "GET" "/organizations/public" "200" "Public organizations"
}

# Тестирование защищенных эндпоинтов (должны возвращать 401)
test_protected_endpoints() {
    log_info "=== ТЕСТИРОВАНИЕ ЗАЩИЩЕННЫХ ЭНДПОИНТОВ (401) ==="
    
    test_endpoint "GET" "/users" "401" "Users list without auth"
    test_endpoint "GET" "/orders" "401" "Orders list without auth"
    test_endpoint "GET" "/organizations" "401" "Organizations list without auth"
    test_endpoint "GET" "/notifications" "401" "Notifications without auth"
    test_endpoint "GET" "/files" "200" "Files list (public)"
    test_endpoint "GET" "/statistics/earnings" "401" "Statistics without auth"
    test_endpoint "GET" "/calculations/salary" "401" "Calculations without auth"
    test_endpoint "GET" "/reports/engineer-salaries-chart" "401" "Reports without auth"
    test_endpoint "GET" "/backup/list" "401" "Backup without auth"
    test_endpoint "GET" "/work-sessions" "401" "Work sessions without auth"
    test_endpoint "GET" "/engineer-organization-rates" "401" "Engineer rates without auth"
    test_endpoint "GET" "/api/salary-payments" "401" "Salary payments without auth"
    test_endpoint "GET" "/products" "401" "Products without auth"
    test_endpoint "GET" "/export/orders" "401" "Export without auth"
}

# Тестирование несуществующих эндпоинтов (должны возвращать 404)
test_not_found_endpoints() {
    log_info "=== ТЕСТИРОВАНИЕ НЕСУЩЕСТВУЮЩИХ ЭНДПОИНТОВ (404) ==="
    
    test_endpoint "GET" "/nonexistent" "404" "Non-existent endpoint"
    test_endpoint "GET" "/api/invalid" "404" "Invalid API endpoint"
    test_endpoint "GET" "/test/invalid" "404" "Invalid test endpoint"
    test_endpoint "POST" "/nonexistent" "404" "POST to non-existent"
    test_endpoint "PUT" "/nonexistent" "404" "PUT to non-existent"
    test_endpoint "DELETE" "/nonexistent" "404" "DELETE to non-existent"
}

# Тестирование методов (GET должен работать, POST/PUT/DELETE без данных - 400/401)
test_methods() {
    log_info "=== ТЕСТИРОВАНИЕ HTTP МЕТОДОВ ==="
    
    # GET работает для публичных эндпоинтов
    test_endpoint "GET" "/test" "200" "GET method"
    
    # POST без данных должен возвращать 400 или 401
    test_endpoint "POST" "/test" "404" "POST to test (404 - no route)"
    test_endpoint "POST" "/auth/login" "400" "POST login without data"
    test_endpoint "POST" "/users" "401" "POST users without auth"
    test_endpoint "POST" "/orders" "401" "POST orders without auth"
    
    # PUT без данных
    test_endpoint "PUT" "/test" "404" "PUT to test (404 - no route)"
    test_endpoint "PUT" "/users/1" "401" "PUT users without auth"
    
    # DELETE без данных
    test_endpoint "DELETE" "/test" "404" "DELETE to test (404 - no route)"
    test_endpoint "DELETE" "/users/1" "401" "DELETE users without auth"
}

# Тестирование параметров запроса
test_query_parameters() {
    log_info "=== ТЕСТИРОВАНИЕ ПАРАМЕТРОВ ЗАПРОСА ==="
    
    # Валидные параметры
    test_endpoint "GET" "/test/organizations?limit=10" "200" "With valid query params"
    test_endpoint "GET" "/organizations/public?limit=5" "200" "Public orgs with params"
    
    # Невалидные параметры (должны обрабатываться gracefully)
    test_endpoint "GET" "/test/organizations?invalid=value" "200" "With invalid query params"
    test_endpoint "GET" "/organizations/public?page=abc" "200" "Invalid page parameter"
}

# Функция для вывода итогового отчета
print_summary() {
    echo ""
    echo "=================================================================================="
    echo -e "${PURPLE}                           ИТОГОВЫЙ ОТЧЕТ${NC}"
    echo "=================================================================================="
    echo -e "Всего тестов: ${CYAN}$TOTAL_TESTS${NC}"
    echo -e "Прошло: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Провалено: ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!${NC}"
        echo -e "${CYAN}Все API эндпоинты работают корректно${NC}"
        return 0
    else
        echo -e "\n${YELLOW}⚠️  ЕСТЬ ПРОБЛЕМЫ С НЕКОТОРЫМИ ЭНДПОИНТАМИ${NC}"
        echo -e "Процент успеха: ${YELLOW}$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%${NC}"
        return 1
    fi
}

# Основная функция
main() {
    echo -e "${PURPLE}=================================================================================="
    echo -e "                    ТЕСТИРОВАНИЕ API ЭНДПОИНТОВ"
    echo -e "==================================================================================${NC}"
    
    # Проверка сервера
    if ! check_server; then
        echo -e "${RED}❌ Сервер недоступен. Убедитесь, что backend запущен на $BASE_URL${NC}"
        echo -e "${YELLOW}💡 Запустите: cd backend && npm run start:dev${NC}"
        exit 1
    fi
    
    # Запуск всех тестов
    test_public_endpoints
    test_protected_endpoints
    test_not_found_endpoints
    test_methods
    test_query_parameters
    
    # Вывод итогового отчета
    print_summary
}

# Запуск основной функции
main "$@"
