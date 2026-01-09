#!/usr/bin/env bash
# =============================================================================
# dev-start.sh - Start development infrastructure
# Compatible with: bash, zsh
#
# Usage:
#   ./dev-start.sh           Start all services
#   ./dev-start.sh --help    Show help
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

# Colors for output (works in bash and zsh)
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly GRAY='\033[0;90m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly DOCKER_COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.yml"

# Timeouts (in seconds)
readonly REDIS_TIMEOUT=30
readonly SUPABASE_TIMEOUT=180

# Track cleanup state
CLEANUP_DONE=false

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

print_debug() {
    echo -e "${GRAY}  → $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Run command with timeout
run_with_timeout() {
    local timeout=$1
    local description=$2
    shift 2

    print_debug "Running: $* (timeout: ${timeout}s)"

    if timeout "$timeout" "$@"; then
        return 0
    else
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            print_error "Command timed out after ${timeout}s: $description"
        else
            print_error "Command failed (exit $exit_code): $description"
        fi
        return $exit_code
    fi
}

# Cleanup handler for Ctrl+C
cleanup() {
    if [[ "$CLEANUP_DONE" == "true" ]]; then
        return
    fi
    CLEANUP_DONE=true

    echo ""
    print_warning "Interrupted! Cleaning up..."
    print_info "Services may be partially started. Run 'pnpm infra:down' to clean up."
    exit 130
}

# Set up trap for SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# =============================================================================
# Help & Usage
# =============================================================================

show_help() {
    cat << EOF
${BOLD}Life Assistant - Start Infrastructure${NC}

${BOLD}USAGE${NC}
    pnpm infra:up [OPTIONS]

${BOLD}OPTIONS${NC}
    ${GREEN}--help${NC}      Show this help message
    ${GREEN}-h${NC}          Alias for --help

${BOLD}WHAT IT STARTS${NC}
    ${GREEN}Docker Services:${NC}
      • Redis         - Cache and session storage (port 6379)
      • MinIO         - S3-compatible object storage (port 9000/9001)

    ${GREEN}Supabase Services:${NC}
      • PostgreSQL    - Database (port 54322)
      • Auth          - Authentication service
      • Studio        - Database GUI (port 54323)
      • Inbucket      - Email testing (port 54324)
      • REST API      - PostgREST (port 54321)

${BOLD}AFTER STARTUP${NC}
    The script will also:
      • Apply database migrations (Drizzle)
      • Seed the database with test data

${BOLD}EXAMPLES${NC}
    ${GRAY}# Start all services${NC}
    pnpm infra:up

    ${GRAY}# Start fresh (reset first, then start)${NC}
    pnpm infra:down --reset && pnpm infra:up

${BOLD}SEE ALSO${NC}
    pnpm infra:down          Stop services
    pnpm infra:down --help   Show stop options
    pnpm infra:down --reset  Stop and delete all data

EOF
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

check_docker() {
    print_info "Checking Docker..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        print_debug "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        print_debug "On Linux: sudo systemctl start docker"
        print_debug "On macOS/Windows: Start Docker Desktop"
        exit 1
    fi

    print_success "Docker is running"
}

check_docker_compose_file() {
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    print_debug "Docker Compose file: $DOCKER_COMPOSE_FILE"
}

check_supabase_config() {
    local config_file="$PROJECT_ROOT/supabase/config.toml"
    if [[ ! -f "$config_file" ]]; then
        print_error "Supabase config not found: $config_file"
        print_debug "Run 'npx supabase init' to initialize Supabase"
        exit 1
    fi
    print_debug "Supabase config: $config_file"
}

ensure_supabase_cli() {
    print_info "Checking Supabase CLI..."

    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Please install Node.js first."
        exit 1
    fi

    # Pre-install supabase CLI to avoid interactive prompts
    # The -y flag auto-accepts the installation
    print_debug "Ensuring Supabase CLI is available..."
    if ! npx -y supabase --version &> /dev/null; then
        print_error "Failed to initialize Supabase CLI"
        exit 1
    fi

    local version
    version=$(npx -y supabase --version 2>/dev/null || echo "unknown")
    print_success "Supabase CLI ready (v$version)"
}

# =============================================================================
# Service Management
# =============================================================================

start_docker_services() {
    print_header "Starting Docker Services (Redis + MinIO)"

    print_info "Starting containers..."
    print_debug "Command: docker compose -f $DOCKER_COMPOSE_FILE up -d"

    if ! docker compose -f "$DOCKER_COMPOSE_FILE" up -d 2>&1; then
        print_error "Failed to start Docker services"
        print_debug "Check docker-compose logs: docker compose -f $DOCKER_COMPOSE_FILE logs"
        exit 1
    fi

    # Wait for Redis to be healthy
    print_info "Waiting for Redis to be ready (timeout: ${REDIS_TIMEOUT}s)..."
    local count=0

    while [[ $count -lt $REDIS_TIMEOUT ]]; do
        if docker exec life-assistant-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            print_success "Redis is ready"
            break
        fi
        count=$((count + 1))
        # Show progress every 5 seconds
        if [[ $((count % 5)) -eq 0 ]]; then
            print_debug "Still waiting for Redis... (${count}s)"
        fi
        sleep 1
    done

    if [[ $count -eq $REDIS_TIMEOUT ]]; then
        print_error "Redis failed to start within ${REDIS_TIMEOUT}s"
        print_debug "Check Redis logs: docker logs life-assistant-redis"
        exit 1
    fi

    # Check MinIO is running
    if docker ps --filter "name=life-assistant-minio" --filter "status=running" | grep -q minio; then
        print_success "MinIO is ready"
    else
        print_error "MinIO failed to start"
        print_debug "Check MinIO logs: docker logs life-assistant-minio"
        exit 1
    fi

    print_success "Docker services started successfully"
}

check_supabase_running() {
    # Check if supabase containers are running by looking for the db container
    if docker ps --filter "name=supabase_db" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "supabase"; then
        return 0
    fi
    return 1
}

start_supabase() {
    print_header "Starting Supabase (PostgreSQL + Auth + Studio)"

    # Check if Supabase is already running
    if check_supabase_running; then
        print_warning "Supabase is already running"
        print_info "Showing current status..."
        npx -y supabase status 2>/dev/null || true
        return 0
    fi

    print_info "Starting Supabase services (timeout: ${SUPABASE_TIMEOUT}s)..."
    print_debug "This may take a few minutes on first run (downloading images)..."
    print_debug "Command: npx -y supabase start"

    # Start Supabase with timeout
    # We use a subshell to capture output while still showing progress
    local start_output
    local start_exit_code=0

    # Run supabase start and capture output
    if start_output=$(timeout "$SUPABASE_TIMEOUT" npx -y supabase start 2>&1); then
        print_success "Supabase started successfully"
        echo ""
        echo "$start_output" | tail -40  # Show the status output
    else
        start_exit_code=$?

        if [[ $start_exit_code -eq 124 ]]; then
            print_error "Supabase start timed out after ${SUPABASE_TIMEOUT}s"
            print_debug "The images might still be downloading. Try running manually:"
            print_debug "  npx -y supabase start"
        else
            print_error "Failed to start Supabase (exit code: $start_exit_code)"
            echo ""
            echo "$start_output" | tail -20
            print_debug ""
            print_debug "Troubleshooting steps:"
            print_debug "  1. Check if ports are in use: lsof -i :54321 -i :54322 -i :54323"
            print_debug "  2. Try stopping first: npx -y supabase stop"
            print_debug "  3. Check Docker logs: docker logs supabase_db_life-assistant"
            print_debug "  4. Run manually with debug: npx -y supabase start --debug"
        fi
        exit 1
    fi
}

apply_database_schema() {
    print_header "Applying Database Schema"

    print_info "Running Drizzle migrations..."
    print_debug "Command: pnpm --filter @life-assistant/database db:push"

    # Change to project root for pnpm command
    cd "$PROJECT_ROOT"

    if pnpm --filter @life-assistant/database db:push 2>&1; then
        print_success "Database schema applied"
    else
        print_warning "Database schema push had issues (may be okay if already applied)"
        print_debug "Run manually if needed: cd packages/database && pnpm db:push"
    fi

    print_info "Running database seed..."
    print_debug "Command: pnpm --filter @life-assistant/database db:seed"

    if pnpm --filter @life-assistant/database db:seed 2>&1; then
        print_success "Database seeded"
    else
        print_warning "Database seed had issues (may be okay if already seeded)"
        print_debug "Run manually if needed: cd packages/database && pnpm db:seed"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    # Parse command line arguments
    parse_args "$@"

    print_header "Life Assistant - Dev Infrastructure"

    local start_time=$SECONDS

    # Pre-flight checks
    check_docker
    check_docker_compose_file
    check_supabase_config
    ensure_supabase_cli

    # Start services
    start_docker_services
    start_supabase
    apply_database_schema

    local elapsed=$((SECONDS - start_time))

    # Final summary
    print_header "Infrastructure Ready! (${elapsed}s)"

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
