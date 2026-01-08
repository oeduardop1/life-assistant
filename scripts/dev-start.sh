#!/usr/bin/env bash
# =============================================================================
# dev-start.sh - Start development infrastructure
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
# Pre-flight Checks
# =============================================================================

check_docker() {
    print_info "Checking Docker..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi

    print_success "Docker is running"
}

check_docker_compose_file() {
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
}

check_supabase_cli() {
    print_info "Checking Supabase CLI..."

    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Please install Node.js first."
        exit 1
    fi

    print_success "Supabase CLI available via npx"
}

# =============================================================================
# Service Management
# =============================================================================

start_docker_services() {
    print_header "Starting Docker Services (Redis + MinIO)"

    print_info "Starting containers..."

    if ! docker compose -f "$DOCKER_COMPOSE_FILE" up -d 2>&1; then
        print_error "Failed to start Docker services"
        exit 1
    fi

    # Wait for Redis to be healthy
    print_info "Waiting for Redis to be ready..."
    local retries=30
    local count=0

    while [[ $count -lt $retries ]]; do
        if docker exec life-assistant-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            print_success "Redis is ready"
            break
        fi
        count=$((count + 1))
        sleep 1
    done

    if [[ $count -eq $retries ]]; then
        print_error "Redis failed to start within ${retries}s"
        exit 1
    fi

    # Check MinIO is running
    if docker ps --filter "name=life-assistant-minio" --filter "status=running" | grep -q minio; then
        print_success "MinIO is ready"
    else
        print_error "MinIO failed to start"
        exit 1
    fi

    print_success "Docker services started successfully"
}

start_supabase() {
    print_header "Starting Supabase (PostgreSQL + Auth + Studio)"

    print_info "This may take a moment on first run..."

    # Check if Supabase is already running
    if npx supabase status &> /dev/null; then
        print_warning "Supabase is already running"
        npx supabase status
        return 0
    fi

    # Start Supabase
    if ! npx supabase start; then
        print_error "Failed to start Supabase"
        print_info "Try running 'npx supabase start' manually to see detailed errors"
        exit 1
    fi

    print_success "Supabase started successfully"
}

# =============================================================================
# Main
# =============================================================================

main() {
    print_header "Life Assistant - Dev Infrastructure"

    # Pre-flight checks
    check_docker
    check_docker_compose_file
    check_supabase_cli

    # Start services
    start_docker_services
    start_supabase

    # Final summary
    print_header "Infrastructure Ready!"

    echo -e "  ${GREEN}Docker Services:${NC}"
    echo -e "    Redis:        ${BLUE}localhost:6379${NC}"
    echo -e "    MinIO:        ${BLUE}localhost:9000${NC} (Console: ${BLUE}localhost:9001${NC})"
    echo ""
    echo -e "  ${GREEN}Supabase Services:${NC}"
    echo -e "    API:          ${BLUE}localhost:54321${NC}"
    echo -e "    PostgreSQL:   ${BLUE}localhost:54322${NC}"
    echo -e "    Studio:       ${BLUE}localhost:54323${NC}"
    echo -e "    Inbucket:     ${BLUE}localhost:54324${NC} (dev emails)"
    echo ""
    echo -e "  ${YELLOW}Next step:${NC} Run ${GREEN}pnpm dev${NC} to start the applications"
    echo ""
}

# Run main function
main "$@"
