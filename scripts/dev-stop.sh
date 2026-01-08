#!/usr/bin/env bash
# =============================================================================
# dev-stop.sh - Stop development infrastructure
# Compatible with: bash, zsh
# =============================================================================

set -euo pipefail

# Colors for output (works in bash and zsh)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.yml"

# Track if any errors occurred
ERRORS=0

# =============================================================================
# Helper Functions
# =============================================================================

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# =============================================================================
# Service Management
# =============================================================================

stop_supabase() {
    print_header "Stopping Supabase"

    # Check if Supabase is running
    if ! npx supabase status &> /dev/null; then
        print_warning "Supabase is not running (or already stopped)"
        return 0
    fi

    print_info "Stopping Supabase services..."

    if npx supabase stop 2>&1; then
        print_success "Supabase stopped successfully"
    else
        print_error "Failed to stop Supabase cleanly"
        print_info "You may need to run 'docker rm -f \$(docker ps -aq --filter name=supabase)' manually"
        ERRORS=$((ERRORS + 1))
    fi
}

stop_docker_services() {
    print_header "Stopping Docker Services (Redis + MinIO)"

    # Check if docker-compose file exists
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_warning "Docker Compose file not found, skipping..."
        return 0
    fi

    # Check if any containers are running
    if ! docker ps --filter "name=life-assistant" --format "{{.Names}}" | grep -q "life-assistant"; then
        print_warning "No Docker services running"
        return 0
    fi

    print_info "Stopping containers..."

    if docker compose -f "$DOCKER_COMPOSE_FILE" down 2>&1; then
        print_success "Docker services stopped successfully"
    else
        print_error "Failed to stop Docker services cleanly"
        ERRORS=$((ERRORS + 1))
    fi
}

verify_stopped() {
    print_header "Verifying Services Stopped"

    local running_containers
    running_containers=$(docker ps --filter "name=life-assistant" --format "{{.Names}}" 2>/dev/null || true)

    if [[ -n "$running_containers" ]]; then
        print_warning "Some containers are still running:"
        echo "$running_containers" | while read -r container; do
            echo "    - $container"
        done
        print_info "Run 'docker stop $running_containers' to force stop"
        ERRORS=$((ERRORS + 1))
    else
        print_success "All life-assistant containers stopped"
    fi

    # Check Supabase containers
    local supabase_containers
    supabase_containers=$(docker ps --filter "name=supabase" --format "{{.Names}}" 2>/dev/null || true)

    if [[ -n "$supabase_containers" ]]; then
        print_warning "Some Supabase containers are still running"
        print_info "Run 'npx supabase stop' again or 'docker stop \$(docker ps -q --filter name=supabase)'"
        ERRORS=$((ERRORS + 1))
    else
        print_success "All Supabase containers stopped"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    print_header "Life Assistant - Stopping Infrastructure"

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_warning "Docker is not running - nothing to stop"
        exit 0
    fi

    # Stop services (Supabase first, then Docker)
    stop_supabase
    stop_docker_services

    # Verify everything stopped
    verify_stopped

    # Final summary
    echo ""
    if [[ $ERRORS -eq 0 ]]; then
        print_success "All services stopped successfully!"
    else
        print_warning "Stopped with $ERRORS warning(s). Check messages above."
    fi
    echo ""

    exit $ERRORS
}

# Run main function
main "$@"
