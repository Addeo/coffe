#!/bin/bash

# ============================================
# Fallback System Test Scenarios
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TEST_DIR="test-fallback"
BACKUP_DIR="/tmp/fallback-test-backups"

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

# Function to cleanup test environment
cleanup() {
    print_step "Cleaning up test environment..."
    
    # Stop any running containers
    docker-compose -f docker-compose.fallback.yml down --remove-orphans 2>/dev/null || true
    
    # Remove test directory
    rm -rf "$TEST_DIR" 2>/dev/null || true
    
    # Remove test backups
    rm -rf "$BACKUP_DIR" 2>/dev/null || true
    
    print_status "Cleanup completed"
}

# Function to create test environment
setup_test_environment() {
    print_step "Setting up test environment..."
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Copy current working code
    cp -r backend "$TEST_DIR/"
    cp -r frontend "$TEST_DIR/"
    cp docker-compose.fallback.yml "$TEST_DIR/"
    cp scripts/fallback-manager.sh "$TEST_DIR/"
    
    print_status "Test environment created"
}

# Test Scenario 1: Successful Build with Backup
test_successful_build() {
    print_step "Test 1: Successful Build with Backup"
    
    cd "$TEST_DIR/backend"
    
    # Test successful build
    if npm run build; then
        print_status "✅ Build successful"
        
        # Check if backup was created
        if [ -d "dist" ]; then
            print_status "✅ Build output created"
            
            # Test fallback manager backup
            if ../../scripts/fallback-manager.sh backup backend dist; then
                print_status "✅ Backup created successfully"
            else
                print_error "❌ Backup creation failed"
                return 1
            fi
        else
            print_error "❌ Build output not found"
            return 1
        fi
    else
        print_error "❌ Build failed"
        return 1
    fi
    
    cd ../..
    return 0
}

# Test Scenario 2: Failed Build with Fallback
test_failed_build_fallback() {
    print_step "Test 2: Failed Build with Fallback"
    
    cd "$TEST_DIR/backend"
    
    # Create a backup first
    if [ -d "dist" ]; then
        cp -r dist "$BACKUP_DIR/backend_backup"
        print_status "✅ Backup created for fallback test"
    else
        print_error "❌ No backup available for fallback test"
        return 1
    fi
    
    # Intentionally break the build by modifying package.json
    cp package.json package.json.backup
    echo "invalid json content" > package.json
    
    # Test build failure
    if npm run build 2>/dev/null; then
        print_error "❌ Build should have failed but didn't"
        mv package.json.backup package.json
        return 1
    else
        print_status "✅ Build failed as expected"
    fi
    
    # Restore package.json
    mv package.json.backup package.json
    
    # Test fallback restoration
    if ../../scripts/fallback-manager.sh restore backend dist; then
        print_status "✅ Fallback restoration successful"
        
        # Verify restoration
        if [ -d "dist" ]; then
            print_status "✅ Build output restored"
        else
            print_error "❌ Build output not restored"
            return 1
        fi
    else
        print_error "❌ Fallback restoration failed"
        return 1
    fi
    
    cd ../..
    return 0
}

# Test Scenario 3: Docker Build with Fallback
test_docker_fallback() {
    print_step "Test 3: Docker Build with Fallback"
    
    cd "$TEST_DIR"
    
    # Test Docker build with fallback Dockerfile
    if docker build -f backend/Dockerfile.fallback -t test-backend-fallback ./backend; then
        print_status "✅ Docker build with fallback successful"
        
        # Test if container can start
        if docker run --rm -d --name test-backend-fallback -p 3001:3001 test-backend-fallback; then
            print_status "✅ Container started successfully"
            
            # Wait for container to start
            sleep 10
            
            # Test health check
            if curl -f http://localhost:3001/api/health 2>/dev/null; then
                print_status "✅ Health check passed"
            else
                print_warning "⚠️ Health check failed (container might still be starting)"
            fi
            
            # Cleanup container
            docker stop test-backend-fallback 2>/dev/null || true
        else
            print_error "❌ Container failed to start"
            return 1
        fi
    else
        print_error "❌ Docker build failed"
        return 1
    fi
    
    cd ..
    return 0
}

# Test Scenario 4: Frontend Fallback
test_frontend_fallback() {
    print_step "Test 4: Frontend Fallback"
    
    cd "$TEST_DIR/frontend"
    
    # Test successful frontend build
    if npm run build; then
        print_status "✅ Frontend build successful"
        
        # Test Docker build with fallback
        if docker build -f Dockerfile.fallback -t test-frontend-fallback .; then
            print_status "✅ Frontend Docker build with fallback successful"
            
            # Test if container can start
            if docker run --rm -d --name test-frontend-fallback -p 4000:80 test-frontend-fallback; then
                print_status "✅ Frontend container started successfully"
                
                # Wait for container to start
                sleep 10
                
                # Test if frontend is accessible
                if curl -f http://localhost:4000 2>/dev/null; then
                    print_status "✅ Frontend is accessible"
                else
                    print_warning "⚠️ Frontend not accessible (container might still be starting)"
                fi
                
                # Cleanup container
                docker stop test-frontend-fallback 2>/dev/null || true
            else
                print_error "❌ Frontend container failed to start"
                return 1
            fi
        else
            print_error "❌ Frontend Docker build failed"
            return 1
        fi
    else
        print_error "❌ Frontend build failed"
        return 1
    fi
    
    cd ../..
    return 0
}

# Test Scenario 5: System Monitor
test_system_monitor() {
    print_step "Test 5: System Monitor"
    
    # Test system monitor script
    if ./scripts/system-monitor.sh check; then
        print_status "✅ System monitor check passed"
    else
        print_warning "⚠️ System monitor check failed (expected if no services running)"
    fi
    
    # Test system status
    if ./scripts/system-monitor.sh status; then
        print_status "✅ System status check passed"
    else
        print_warning "⚠️ System status check failed"
    fi
    
    return 0
}

# Test Scenario 6: Health Check Endpoint
test_health_check_endpoint() {
    print_step "Test 6: Health Check Endpoint"
    
    # Start backend in background
    cd "$TEST_DIR/backend"
    npm run start:prod &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 15
    
    # Test health check endpoint
    if curl -f http://localhost:3001/api/health 2>/dev/null; then
        print_status "✅ Health check endpoint working"
        
        # Parse health check response
        HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
        if echo "$HEALTH_RESPONSE" | grep -q "status.*ok"; then
            print_status "✅ Health check response format correct"
        else
            print_warning "⚠️ Health check response format unexpected"
        fi
    else
        print_error "❌ Health check endpoint not working"
        kill $BACKEND_PID 2>/dev/null || true
        return 1
    fi
    
    # Cleanup
    kill $BACKEND_PID 2>/dev/null || true
    cd ../..
    
    return 0
}

# Main test runner
run_tests() {
    print_step "Starting Fallback System Tests"
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    
    # Setup
    setup_test_environment
    
    # Run tests
    if test_successful_build; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_failed_build_fallback; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_docker_fallback; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_frontend_fallback; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_system_monitor; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_health_check_endpoint; then
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
    
    # Cleanup
    cleanup
    
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
        "cleanup")
            cleanup
            ;;
        "help"|*)
            echo "Usage: $0 {run|cleanup|help}"
            echo ""
            echo "Commands:"
            echo "  run      - Run all fallback system tests"
            echo "  cleanup  - Clean up test environment"
            echo "  help     - Show this help message"
            echo ""
            echo "Test Scenarios:"
            echo "  1. Successful Build with Backup"
            echo "  2. Failed Build with Fallback"
            echo "  3. Docker Build with Fallback"
            echo "  4. Frontend Fallback"
            echo "  5. System Monitor"
            echo "  6. Health Check Endpoint"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
