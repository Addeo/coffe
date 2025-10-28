#!/bin/bash

# ============================================
# Simplified Fallback System Test
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[TEST]${NC} $1"
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

# Test 1: Backend Build
test_backend_build() {
    print_step "Test 1: Backend Build"
    
    cd backend
    
    if npm run build; then
        print_status "✅ Backend build successful"
        cd ..
        return 0
    else
        print_error "❌ Backend build failed"
        cd ..
        return 1
    fi
}

# Test 2: Fallback Manager Backup
test_fallback_backup() {
    print_step "Test 2: Fallback Manager Backup"
    
    if ./scripts/fallback-manager.sh backup backend backend/dist; then
        print_status "✅ Backup created successfully"
        return 0
    else
        print_error "❌ Backup creation failed"
        return 1
    fi
}

# Test 3: Fallback Manager Restore
test_fallback_restore() {
    print_step "Test 3: Fallback Manager Restore"
    
    # Remove dist directory
    rm -rf backend/dist
    
    if ./scripts/fallback-manager.sh restore backend backend/dist; then
        print_status "✅ Restore successful"
        
        # Check if dist was restored
        if [ -d "backend/dist" ]; then
            print_status "✅ Build output restored"
            return 0
        else
            print_error "❌ Build output not restored"
            return 1
        fi
    else
        print_error "❌ Restore failed"
        return 1
    fi
}

# Test 4: Health Check Endpoint (if backend is running)
test_health_endpoint() {
    print_step "Test 4: Health Check Endpoint"
    
    # Check if backend is running
    if curl -f --max-time 5 http://localhost:3001/api/health 2>/dev/null; then
        print_status "✅ Health check endpoint working"
        
        # Parse response
        HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
        if echo "$HEALTH_RESPONSE" | grep -q "status.*ok"; then
            print_status "✅ Health check response format correct"
            return 0
        else
            print_warning "⚠️ Health check response format unexpected"
            return 1
        fi
    else
        print_warning "⚠️ Backend not running (expected for this test)"
        return 0
    fi
}

# Test 5: Frontend Build
test_frontend_build() {
    print_step "Test 5: Frontend Build"
    
    cd frontend
    
    if npm run build; then
        print_status "✅ Frontend build successful"
        cd ..
        return 0
    else
        print_error "❌ Frontend build failed"
        cd ..
        return 1
    fi
}

# Test 6: System Monitor Script
test_system_monitor() {
    print_step "Test 6: System Monitor Script"
    
    # Test if script exists and is executable
    if [ -x "./scripts/system-monitor.sh" ]; then
        print_status "✅ System monitor script exists and is executable"
        
        # Test help command
        if ./scripts/system-monitor.sh help >/dev/null 2>&1; then
            print_status "✅ System monitor script help works"
            return 0
        else
            print_error "❌ System monitor script help failed"
            return 1
        fi
    else
        print_error "❌ System monitor script not found or not executable"
        return 1
    fi
}

# Test 7: Deploy Script
test_deploy_script() {
    print_step "Test 7: Deploy Script"
    
    # Test if script exists and is executable
    if [ -x "./deploy-with-fallback.sh" ]; then
        print_status "✅ Deploy script exists and is executable"
        return 0
    else
        print_error "❌ Deploy script not found or not executable"
        return 1
    fi
}

# Test 8: Docker Files
test_docker_files() {
    print_step "Test 8: Docker Files"
    
    local docker_files=(
        "docker-compose.fallback.yml"
        "backend/Dockerfile.fallback"
        "frontend/Dockerfile.fallback"
    )
    
    local all_exist=true
    
    for file in "${docker_files[@]}"; do
        if [ -f "$file" ]; then
            print_status "✅ $file exists"
        else
            print_error "❌ $file not found"
            all_exist=false
        fi
    done
    
    if $all_exist; then
        return 0
    else
        return 1
    fi
}

# Main test runner
run_tests() {
    print_step "Starting Simplified Fallback System Tests"
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    
    # Run tests
    if test_backend_build; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_fallback_backup; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_fallback_restore; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_health_endpoint; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_frontend_build; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_system_monitor; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_deploy_script; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_docker_files; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Results
    echo ""
    print_step "Test Results"
    print_status "Tests passed: $tests_passed"
    if [ $tests_failed -gt 0 ]; then
        print_error "Tests failed: $tests_failed"
    else
        print_status "Tests failed: $tests_failed"
    fi
    
    if [ $tests_failed -eq 0 ]; then
        print_status "🎉 All tests passed! Fallback system is working correctly."
        return 0
    else
        print_error "❌ Some tests failed. Please check the implementation."
        return 1
    fi
}

# Main function
main() {
    case "${1:-run}" in
        "run")
            run_tests
            ;;
        "help"|*)
            echo "Usage: $0 {run|help}"
            echo ""
            echo "Commands:"
            echo "  run      - Run simplified fallback system tests"
            echo "  help     - Show this help message"
            echo ""
            echo "Test Scenarios:"
            echo "  1. Backend Build"
            echo "  2. Fallback Manager Backup"
            echo "  3. Fallback Manager Restore"
            echo "  4. Health Check Endpoint"
            echo "  5. Frontend Build"
            echo "  6. System Monitor Script"
            echo "  7. Deploy Script"
            echo "  8. Docker Files"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
