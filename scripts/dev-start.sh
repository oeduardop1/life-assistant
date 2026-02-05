#!/usr/bin/env bash
# =============================================================================
# dev-start.sh - Start development infrastructure
# Compatible with: bash, zsh
#
# Usage:
#   ./dev-start.sh           Start all services
#   ./dev-start.sh --clean   Clean up first, then start
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
readonly CYAN='\033[0;36m'
readonly GRAY='\033[0;90m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly DOCKER_COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.yml"

# Timeouts (in seconds) - can be overridden with --timeout
DEFAULT_REDIS_TIMEOUT=30
DEFAULT_SUPABASE_TIMEOUT=180
DEFAULT_DB_WAIT_TIMEOUT=60

REDIS_TIMEOUT=$DEFAULT_REDIS_TIMEOUT
SUPABASE_TIMEOUT=$DEFAULT_SUPABASE_TIMEOUT
DB_WAIT_TIMEOUT=$DEFAULT_DB_WAIT_TIMEOUT

# Operation modes
CLEAN_MODE=false
VERBOSE_MODE=false
USER_SET_TIMEOUT=false
SKIP_MIGRATIONS=false
FORCE_SEED=false
SKIP_IMAGE_CLEANUP=false
CLEAN_BUILD_CACHE=false

# Supabase ports
readonly SUPABASE_API_PORT=54321
readonly SUPABASE_DB_PORT=54322
readonly SUPABASE_STUDIO_PORT=54323

# Supabase CLI path (resolved in ensure_supabase_cli)
SUPABASE_BIN=""

# Track state
CLEANUP_DONE=false
ERRORS=0
WARNINGS=0
STEP_START=0
CURRENT_STEP=""

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
    WARNINGS=$((WARNINGS + 1))
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
    ERRORS=$((ERRORS + 1))
}

print_debug() {
    echo -e "${GRAY}  → $1${NC}"
}

print_verbose() {
    if [[ "$VERBOSE_MODE" == "true" ]]; then
        echo -e "${GRAY}  [DEBUG] $1${NC}"
    fi
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Start timing a step
start_step() {
    local step_num=$1
    local total=$2
    local step_name=$3
    CURRENT_STEP="$step_name"
    STEP_START=$SECONDS
    print_header "Step ${step_num}/${total}: ${step_name}"
}

# End timing a step
end_step() {
    local elapsed=$((SECONDS - STEP_START))
    print_debug "Completed in ${elapsed}s"
}

# Show spinner while waiting for a process
show_progress() {
    local pid=$1
    local description=$2
    local timeout=$3
    local start=$SECONDS
    local spinner='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0

    while kill -0 "$pid" 2>/dev/null; do
        local elapsed=$((SECONDS - start))
        if [[ $elapsed -ge $timeout ]]; then
            kill -9 "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
            return 124
        fi
        printf "\r${GRAY}  %s ${description} (%ds)${NC}  " "${spinner:i++%${#spinner}:1}" "$elapsed"
        sleep 0.1
    done
    printf "\r%-60s\r" " "  # Clear the line
    wait "$pid" 2>/dev/null
    return $?
}

# Show spinner while waiting for a condition
wait_for_condition() {
    local description=$1
    local timeout=$2
    local check_cmd=$3
    local start=$SECONDS
    local spinner='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0

    while true; do
        local elapsed=$((SECONDS - start))
        if [[ $elapsed -ge $timeout ]]; then
            printf "\r%-60s\r" " "
            return 124
        fi

        if eval "$check_cmd" 2>/dev/null; then
            printf "\r%-60s\r" " "
            return 0
        fi

        printf "\r${GRAY}  %s ${description} (%ds/${timeout}s)${NC}  " "${spinner:i++%${#spinner}:1}" "$elapsed"
        sleep 0.5
    done
}

# Cleanup handler for Ctrl+C
cleanup() {
    if [[ "$CLEANUP_DONE" == "true" ]]; then
        return
    fi
    CLEANUP_DONE=true

    echo ""
    print_warning "Interrupted! Cleaning up..."
    print_info "Services may be partially started."
    echo ""
    print_debug "To clean up: pnpm infra:down"
    print_debug "To retry:    pnpm infra:up --clean"
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
    ${GREEN}--clean, -c${NC}       Clean up zombie containers before starting
                      Use this if you had a previous failed start

    ${GREEN}--skip-migrations${NC}
                      Skip database migrations and seeding

    ${GREEN}--seed, -s${NC}        Force database seeding even on existing databases
                      (seed is idempotent - uses ON CONFLICT DO NOTHING)

    ${GREEN}--no-cleanup${NC}      Skip automatic cleanup of old Docker images
                      (by default, old Supabase images are removed after update)

    ${GREEN}--clean-cache${NC}     Also clean unused Docker build cache

    ${GREEN}--timeout, -t${NC} N   Set timeout for operations in seconds (default: 180, auto-increases on first run)

    ${GREEN}--verbose, -v${NC}     Show detailed debug output

    ${GREEN}--help, -h${NC}        Show this help message

${BOLD}WHAT IT STARTS${NC}
    ${CYAN}Docker Services:${NC}
      • Redis         - Cache and session storage (port 6379)
      • MinIO         - S3-compatible object storage (port 9000/9001)

    ${CYAN}Supabase Services:${NC}
      • PostgreSQL    - Database (port ${SUPABASE_DB_PORT})
      • Auth          - Authentication service (GoTrue)
      • Studio        - Database GUI (port ${SUPABASE_STUDIO_PORT})
      • Inbucket      - Email testing (port 54324)
      • REST API      - PostgREST (port ${SUPABASE_API_PORT})

${BOLD}AFTER STARTUP${NC}
    The script will also:
      • Apply database migrations (Drizzle - safe, applies only pending)
      • Seed the database with test data (only on first setup or with --seed)
      • Apply RLS policies (only if not already enabled)

${BOLD}EXAMPLES${NC}
    ${GRAY}# Start all services${NC}
    pnpm infra:up

    ${GRAY}# Start with cleanup (recommended after failed start)${NC}
    pnpm infra:up --clean

    ${GRAY}# Start with longer timeout and verbose output${NC}
    pnpm infra:up --timeout 180 --verbose

    ${GRAY}# Start fresh (full reset first)${NC}
    pnpm infra:down --reset && pnpm infra:up

${BOLD}TROUBLESHOOTING${NC}
    If startup fails:
      ${CYAN}1.${NC} Run with --clean flag: ${GREEN}pnpm infra:up --clean${NC}
      ${CYAN}2.${NC} Check ports: ${GREEN}lsof -i :54321 -i :54322 -i :54323${NC}
      ${CYAN}3.${NC} Full reset: ${GREEN}pnpm infra:down -r -f && pnpm infra:up${NC}
      ${CYAN}4.${NC} Check Docker: ${GREEN}docker ps -a | grep -E 'supabase|life-assistant'${NC}

${BOLD}SEE ALSO${NC}
    pnpm infra:down          Stop services
    pnpm infra:down --help   Show stop options
    pnpm infra:down -r -f    Stop and delete all data (no confirmation)

EOF
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean|-c)
                CLEAN_MODE=true
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --seed|-s)
                FORCE_SEED=true
                shift
                ;;
            --no-cleanup)
                SKIP_IMAGE_CLEANUP=true
                shift
                ;;
            --clean-cache)
                CLEAN_BUILD_CACHE=true
                shift
                ;;
            --verbose|-v)
                VERBOSE_MODE=true
                shift
                ;;
            --timeout|-t)
                if [[ -z "${2:-}" ]] || [[ ! "$2" =~ ^[0-9]+$ ]]; then
                    print_error "Timeout must be a positive number"
                    exit 1
                fi
                SUPABASE_TIMEOUT=$2
                REDIS_TIMEOUT=$((SUPABASE_TIMEOUT / 4))
                DB_WAIT_TIMEOUT=$((SUPABASE_TIMEOUT / 2))
                USER_SET_TIMEOUT=true
                shift 2
                ;;
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
        print_error "Docker is not installed"
        print_debug "Install from: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        print_debug "On Linux: sudo systemctl start docker"
        print_debug "On macOS/Windows: Start Docker Desktop"
        exit 1
    fi

    print_success "Docker is running"
    print_verbose "Docker version: $(docker --version)"
}

check_docker_compose_file() {
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    print_verbose "Docker Compose file: $DOCKER_COMPOSE_FILE"
}

check_supabase_config() {
    local config_file="$PROJECT_ROOT/supabase/config.toml"
    if [[ ! -f "$config_file" ]]; then
        print_error "Supabase config not found: $config_file"
        print_debug "Run 'npx supabase init' to initialize"
        exit 1
    fi
    print_verbose "Supabase config: $config_file"
}

check_ports() {
    print_info "Checking port availability..."

    local ports_in_use=()
    local check_ports=($SUPABASE_API_PORT $SUPABASE_DB_PORT $SUPABASE_STUDIO_PORT 6379 9000)

    # Detect available port checking tool
    local port_checker=""
    if command -v lsof &>/dev/null; then
        port_checker="lsof"
    elif command -v ss &>/dev/null; then
        port_checker="ss"
    else
        print_warning "Neither lsof nor ss available — skipping port check"
        return 0
    fi

    print_verbose "Using $port_checker for port checks"

    for port in "${check_ports[@]}"; do
        local in_use=false
        if [[ "$port_checker" == "lsof" ]]; then
            if lsof -i ":$port" -sTCP:LISTEN &>/dev/null 2>&1; then
                in_use=true
            fi
        elif [[ "$port_checker" == "ss" ]]; then
            if ss -tlnp "sport = :$port" 2>/dev/null | grep -q ":$port"; then
                in_use=true
            fi
        fi

        if [[ "$in_use" == "true" ]]; then
            ports_in_use+=("$port")
            print_verbose "Port $port appears to be in use"
        fi
    done

    if [[ ${#ports_in_use[@]} -gt 0 ]]; then
        print_warning "Some ports may be in use: ${ports_in_use[*]}"
        print_debug "This might be from a previous run. Try: pnpm infra:up --clean"
    else
        print_success "All required ports are available"
    fi
}

ensure_supabase_cli() {
    print_info "Checking Supabase CLI..."

    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Install Node.js first."
        exit 1
    fi

    print_verbose "Pre-installing Supabase CLI..."

    # Suppress npm warnings by redirecting stderr
    local version
    if version=$(npx -y supabase --version 2>/dev/null); then
        print_success "Supabase CLI ready (v$version)"
    else
        print_error "Failed to initialize Supabase CLI"
        exit 1
    fi

    # Resolve and cache the binary path to avoid repeated npx lookups
    if command -v supabase &>/dev/null; then
        SUPABASE_BIN="supabase"
    else
        SUPABASE_BIN="npx -y supabase"
    fi
    print_verbose "Supabase binary: $SUPABASE_BIN"
}

# =============================================================================
# Cleanup Functions
# =============================================================================

cleanup_zombie_containers() {
    print_info "Cleaning up zombie containers..."

    local zombies=0
    local stale_statuses=("exited" "created" "restarting" "dead")
    local name_filters=("supabase" "life-assistant")

    for name in "${name_filters[@]}"; do
        for status in "${stale_statuses[@]}"; do
            local containers
            containers=$(docker ps -aq --filter "name=$name" --filter "status=$status" 2>/dev/null || true)

            if [[ -n "$containers" ]]; then
                local count
                count=$(echo "$containers" | wc -l | tr -d ' ')
                print_debug "Removing $count $name containers (status: $status)"
                echo "$containers" | xargs -r docker rm -f &>/dev/null || true
                zombies=$((zombies + count))
            fi
        done
    done

    # Clean up dangling networks (disconnect containers first)
    local networks
    networks=$(docker network ls --filter "name=supabase" -q 2>/dev/null || true)
    if [[ -n "$networks" ]]; then
        print_debug "Cleaning up Supabase networks"
        while IFS= read -r net_id; do
            [[ -z "$net_id" ]] && continue
            # Disconnect all containers before removing
            local connected
            connected=$(docker network inspect "$net_id" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || true)
            if [[ -n "$connected" ]]; then
                for container in $connected; do
                    docker network disconnect -f "$net_id" "$container" &>/dev/null || true
                done
            fi
            if ! docker network rm "$net_id" &>/dev/null; then
                print_verbose "Could not remove network $net_id (may be in use by Docker Compose)"
            fi
        done <<< "$networks"
    fi

    if [[ $zombies -gt 0 ]]; then
        print_success "Cleaned up $zombies zombie containers"
    else
        print_success "No zombie containers found"
    fi
}

force_stop_running() {
    print_info "Stopping any running containers..."

    # Stop running supabase containers
    local running
    running=$(docker ps -q --filter "name=supabase" 2>/dev/null || true)
    if [[ -n "$running" ]]; then
        local count
        count=$(echo "$running" | wc -l | tr -d ' ')
        print_debug "Stopping $count running Supabase containers"
        echo "$running" | xargs -r docker stop -t 5 &>/dev/null || true
        echo "$running" | xargs -r docker rm -f &>/dev/null || true
    fi

    # Stop running life-assistant containers
    running=$(docker ps -q --filter "name=life-assistant" 2>/dev/null || true)
    if [[ -n "$running" ]]; then
        local count
        count=$(echo "$running" | wc -l | tr -d ' ')
        print_debug "Stopping $count running life-assistant containers"
        echo "$running" | xargs -r docker stop -t 5 &>/dev/null || true
        echo "$running" | xargs -r docker rm -f &>/dev/null || true
    fi

    # Run supabase stop to clean up properly
    print_debug "Running supabase stop for cleanup"
    timeout 30 $SUPABASE_BIN stop &>/dev/null || true

    print_success "Cleanup complete"
}

# =============================================================================
# Image Cleanup
# =============================================================================

cleanup_old_supabase_images() {
    if [[ "$SKIP_IMAGE_CLEANUP" == "true" ]]; then
        print_verbose "Skipping image cleanup (--no-cleanup flag)"
        return 0
    fi

    print_info "Checking for old Docker images..."

    # Get list of images currently in use by running containers
    local images_in_use
    images_in_use=$(docker ps --format '{{.Image}}' | sort -u)

    # Supabase image patterns to clean
    local patterns=(
        "public.ecr.aws/supabase/postgres"
        "public.ecr.aws/supabase/studio"
        "public.ecr.aws/supabase/logflare"
        "public.ecr.aws/supabase/realtime"
        "public.ecr.aws/supabase/gotrue"
        "public.ecr.aws/supabase/storage-api"
        "public.ecr.aws/supabase/edge-runtime"
        "public.ecr.aws/supabase/postgres-meta"
        "public.ecr.aws/supabase/postgrest"
        "supabase/postgres"
    )

    local removed=0
    local total_size=0

    for pattern in "${patterns[@]}"; do
        # Get all images matching this pattern
        local all_images
        all_images=$(docker images "$pattern" --format '{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}' 2>/dev/null || true)

        while IFS='|' read -r image_tag image_id image_size; do
            [[ -z "$image_tag" ]] && continue

            # Skip if image is in use
            if echo "$images_in_use" | grep -qF "$image_tag"; then
                print_verbose "Keeping (in use): $image_tag"
                continue
            fi

            # Remove unused image
            if docker rmi "$image_id" &>/dev/null; then
                print_debug "Removed: $image_tag ($image_size)"
                removed=$((removed + 1))
            fi
        done <<< "$all_images"
    done

    if [[ $removed -gt 0 ]]; then
        print_success "Removed $removed old Supabase images"
    else
        print_verbose "No old Supabase images to remove"
    fi
}

cleanup_build_cache() {
    if [[ "$CLEAN_BUILD_CACHE" != "true" ]]; then
        return 0
    fi

    print_info "Cleaning unused Docker build cache..."

    local before_size
    before_size=$(docker system df --format '{{.Size}}' 2>/dev/null | tail -1 || echo "unknown")

    if docker builder prune -f &>/dev/null; then
        local after_size
        after_size=$(docker system df --format '{{.Size}}' 2>/dev/null | tail -1 || echo "unknown")
        print_success "Build cache cleaned (was: $before_size)"
    else
        print_warning "Could not clean build cache"
    fi
}

# =============================================================================
# Service Status Checks
# =============================================================================

check_supabase_running() {
    local count
    count=$(docker ps --filter "name=supabase" --filter "status=running" -q 2>/dev/null | wc -l | tr -d ' ')
    # Supabase local runs ~10-12 containers. Minimum 8 indicates complete startup.
    [[ $count -ge 8 ]]
}

check_redis_ready() {
    docker exec life-assistant-redis redis-cli ping 2>/dev/null | grep -q "PONG"
}

check_postgres_ready() {
    docker exec supabase_db_life-assistant pg_isready -U postgres &>/dev/null
}

get_running_container_count() {
    local filter=$1
    docker ps --filter "name=$filter" --filter "status=running" -q 2>/dev/null | wc -l | tr -d ' '
}

# Detect if images need downloading and adjust timeout accordingly
detect_supabase_timeout() {
    if [[ "$USER_SET_TIMEOUT" == "true" ]]; then
        print_verbose "Using user-specified timeout: ${SUPABASE_TIMEOUT}s"
        return 0
    fi

    local missing_images=0
    local key_images=(
        "public.ecr.aws/supabase/postgres"
        "public.ecr.aws/supabase/gotrue"
        "public.ecr.aws/supabase/studio"
    )

    for img in "${key_images[@]}"; do
        if ! docker images "$img" --format '{{.ID}}' 2>/dev/null | grep -q .; then
            missing_images=$((missing_images + 1))
        fi
    done

    if [[ $missing_images -gt 0 ]]; then
        SUPABASE_TIMEOUT=600
        DB_WAIT_TIMEOUT=$((SUPABASE_TIMEOUT / 2))
        print_info "Downloading Docker images (~2GB). This is a one-time operation."
        print_debug "On WSL2 this may take 5-10 minutes due to I/O overhead"
        print_debug "Timeout set to ${SUPABASE_TIMEOUT}s"
    fi
}

# =============================================================================
# Service Management
# =============================================================================

start_docker_services() {
    start_step 1 4 "Docker Services (Redis + MinIO)"

    print_info "Starting containers..."
    print_debug "Command: docker compose up -d"

    # Start containers
    if ! docker compose -f "$DOCKER_COMPOSE_FILE" up -d 2>&1; then
        print_error "Failed to start Docker services"
        print_debug "Check logs: docker compose -f $DOCKER_COMPOSE_FILE logs"
        return 1
    fi

    # Wait for Redis
    print_info "Waiting for Redis..."

    if wait_for_condition "Redis starting" "$REDIS_TIMEOUT" "check_redis_ready"; then
        print_success "Redis is ready"
    else
        print_error "Redis failed to start within ${REDIS_TIMEOUT}s"
        print_debug "Check logs: docker logs life-assistant-redis"
        return 1
    fi

    # Check MinIO
    if docker ps --filter "name=life-assistant-minio" --filter "status=running" -q | grep -q .; then
        print_success "MinIO is ready"
    else
        print_error "MinIO failed to start"
        print_debug "Check logs: docker logs life-assistant-minio"
        return 1
    fi

    end_step
    print_success "Docker services started"
}

start_supabase() {
    start_step 2 4 "Supabase (PostgreSQL + Auth + Studio)"

    # Adjust timeout if images need downloading
    detect_supabase_timeout

    # Check if already running
    if check_supabase_running; then
        print_warning "Supabase is already running"
        local count
        count=$(get_running_container_count "supabase")
        print_debug "$count Supabase containers active"
        end_step
        return 0
    fi

    # Check for partially running state (some containers up, but not enough)
    local partial_count
    partial_count=$(get_running_container_count "supabase")
    if [[ $partial_count -gt 0 ]]; then
        print_warning "Supabase partially running ($partial_count containers). Restarting..."
        timeout 30 $SUPABASE_BIN stop &>/dev/null || true
        sleep 2
    fi

    print_info "Starting Supabase services..."
    print_debug "This may take 1-2 minutes on first run"

    # Capture supabase output to temp file for diagnostics
    local supabase_log
    supabase_log=$(mktemp /tmp/supabase-start-XXXXXX.log)

    # Run supabase start in background with progress (single timeout via show_progress)
    ($SUPABASE_BIN start >> "$supabase_log" 2>&1) &
    local pid=$!

    if show_progress $pid "Supabase starting" "$SUPABASE_TIMEOUT"; then
        # Verify it actually started
        sleep 2
        if check_supabase_running; then
            local count
            count=$(get_running_container_count "supabase")
            print_success "Supabase started ($count containers)"
            print_verbose "Supabase log: $(cat "$supabase_log")"
        else
            print_error "Supabase process completed but containers not running"
            print_info "Supabase output:"
            tail -20 "$supabase_log" >&2
            show_supabase_troubleshooting
            rm -f "$supabase_log"
            return 1
        fi
    else
        print_error "Supabase start timed out after ${SUPABASE_TIMEOUT}s"
        print_info "Last output from Supabase:"
        tail -20 "$supabase_log" >&2
        show_supabase_troubleshooting
        rm -f "$supabase_log"
        return 1
    fi

    rm -f "$supabase_log"

    # Wait for PostgreSQL to be fully ready
    print_info "Waiting for PostgreSQL to be ready..."

    if wait_for_condition "PostgreSQL initializing" "$DB_WAIT_TIMEOUT" "check_postgres_ready"; then
        print_success "PostgreSQL is ready"
    else
        print_warning "PostgreSQL health check timed out (may still be initializing)"
    fi

    end_step
}

show_supabase_troubleshooting() {
    echo ""
    print_info "Troubleshooting steps:"
    echo ""
    echo -e "  ${CYAN}1. Check ports:${NC}"
    echo -e "     lsof -i :$SUPABASE_API_PORT -i :$SUPABASE_DB_PORT -i :$SUPABASE_STUDIO_PORT"
    echo ""
    echo -e "  ${CYAN}2. Clean up and retry:${NC}"
    echo -e "     pnpm infra:up --clean"
    echo ""
    echo -e "  ${CYAN}3. Full reset:${NC}"
    echo -e "     pnpm infra:down -r -f && pnpm infra:up"
    echo ""
    echo -e "  ${CYAN}4. Check Docker logs:${NC}"
    echo -e "     docker logs supabase_db_life-assistant"
    echo ""
    echo -e "  ${CYAN}5. Run with debug:${NC}"
    echo -e "     npx supabase start --debug"
    echo ""
}

show_supabase_status() {
    start_step 3 4 "Service Status"

    print_info "Fetching Supabase status..."

    # Use subshell with || true to prevent script exit on failure
    local status_output
    status_output=$($SUPABASE_BIN status 2>&1) || true

    if [[ -n "$status_output" ]] && ! echo "$status_output" | grep -q "Error\|error\|failed"; then
        echo ""
        # Use grep with || true to handle case where no matches found
        echo "$status_output" | grep -E "(API URL|GraphQL URL|S3 Storage|DB URL|Studio URL|Inbucket URL|JWT secret|anon key|service_role key)" | while read -r line; do
            echo -e "  ${GREEN}•${NC} $line"
        done || true
        echo ""
        print_success "Status retrieved"
    else
        print_warning "Could not fetch status (services may still be starting)"
        print_debug "This is normal - status was shown during startup"
    fi

    end_step
}

apply_database_schema() {
    start_step 4 4 "Database Schema"

    if [[ "$SKIP_MIGRATIONS" == "true" ]]; then
        print_warning "Skipping migrations (--skip-migrations flag)"
        end_step
        return 0
    fi

    cd "$PROJECT_ROOT"

    # Detect if this is a fresh database (no users table = first setup)
    local is_fresh_db=false
    local db_check=""
    local db_check_exit=0
    db_check=$(docker exec supabase_db_life-assistant psql -U postgres -d postgres -tAc \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');" 2>&1) || db_check_exit=$?

    if [[ $db_check_exit -ne 0 ]]; then
        print_warning "Could not query database (exit code: $db_check_exit)"
        print_verbose "Output: $db_check"
        print_debug "Assuming fresh database"
        is_fresh_db=true
    elif [[ "$db_check" != "t" ]]; then
        is_fresh_db=true
        print_info "Fresh database detected - will run migrations + seed"
    else
        print_info "Existing database detected - checking migration status"
    fi

    # Check if there are pending migrations before running
    local migration_files_count=0
    local journal_entries_count=0
    local has_pending_migrations=true

    # Count migration SQL files
    local migrations_dir="$PROJECT_ROOT/packages/database/src/migrations"

    if [[ ! -d "$migrations_dir" ]]; then
        print_warning "Migrations directory not found: $migrations_dir"
        print_debug "Expected at: packages/database/src/migrations/"
        has_pending_migrations=true
    else
        shopt -s nullglob
        local sql_files=("$migrations_dir"/*.sql)
        shopt -u nullglob
        migration_files_count=${#sql_files[@]}
        print_verbose "Found $migration_files_count migration files"
    fi

    # Count journal entries (if table exists)
    local journal_exit=0
    journal_entries_count=$(docker exec supabase_db_life-assistant psql -U postgres -d postgres -tAc \
        "SELECT COUNT(*)::int FROM drizzle.__drizzle_migrations;" 2>/dev/null) || journal_exit=$?

    if [[ $journal_exit -ne 0 ]]; then
        print_verbose "Migration journal not found (first migration)"
        journal_entries_count=0
    fi

    if [[ "$migration_files_count" -eq "$journal_entries_count" ]] && [[ "$journal_entries_count" -gt 0 ]]; then
        has_pending_migrations=false
        print_success "Database schema up to date ($journal_entries_count migrations applied)"
    fi

    if [[ "$has_pending_migrations" == "true" ]]; then
        # Apply migrations (safe, non-interactive, applies only pending SQL files)
        print_info "Running Drizzle migrations..."
        print_debug "Command: pnpm --filter @life-assistant/database db:migrate"

        local migrate_exit_code=0
        pnpm --filter @life-assistant/database db:migrate || migrate_exit_code=$?

        if [[ $migrate_exit_code -eq 0 ]]; then
            print_success "Database migrations applied"
        else
            print_error "Migration failed (exit code: $migrate_exit_code)"
            print_debug "Check migration files in: packages/database/src/migrations/"
            print_debug "For a fresh start: pnpm infra:down -rf && pnpm infra:up"
            end_step
            return 1
        fi
    fi

    echo ""

    # Seed database (only on fresh DB or with --seed flag)
    if [[ "$is_fresh_db" == "true" ]] || [[ "$FORCE_SEED" == "true" ]]; then
        if [[ "$FORCE_SEED" == "true" ]] && [[ "$is_fresh_db" != "true" ]]; then
            print_info "Running database seed (--seed flag)..."
        else
            print_info "Running database seed (first setup)..."
        fi
        print_debug "Command: pnpm --filter @life-assistant/database db:seed"

        local seed_exit_code=0
        local seed_output
        seed_output=$(pnpm --filter @life-assistant/database db:seed 2>&1) || seed_exit_code=$?

        if [[ $seed_exit_code -eq 0 ]]; then
            print_success "Database seeded"
            print_verbose "$seed_output"
        else
            print_warning "Seed had issues (exit code: $seed_exit_code)"
            if [[ -n "$seed_output" ]]; then
                echo -e "${GRAY}$seed_output${NC}"
            fi
        fi
    else
        print_debug "Skipping seed (existing database - use --seed to force)"
    fi

    echo ""

    # Apply RLS policies (only if not already enabled)
    # Check if RLS is enabled on the users table as indicator
    local rls_enabled=""
    local rls_exit=0
    rls_enabled=$(docker exec supabase_db_life-assistant psql -U postgres -d postgres -tAc \
        "SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace;" 2>&1) || rls_exit=$?

    if [[ $rls_exit -ne 0 ]]; then
        print_verbose "Could not check RLS status (exit code: $rls_exit)"
        rls_enabled=""
    fi

    if [[ "$rls_enabled" == "t" ]]; then
        print_success "RLS policies already applied"
    else
        print_info "Applying RLS policies..."
        print_debug "Command: pnpm --filter @life-assistant/database db:apply-rls"

        local rls_exit_code=0
        pnpm --filter @life-assistant/database db:apply-rls || rls_exit_code=$?

        if [[ $rls_exit_code -eq 0 ]]; then
            print_success "RLS policies applied"
        else
            print_warning "RLS application had issues (exit code: $rls_exit_code)"
            print_debug "You can manually apply with: pnpm --filter @life-assistant/database db:apply-rls"
        fi
    fi

    end_step
}

# =============================================================================
# Summary
# =============================================================================

show_summary() {
    local elapsed=$1

    print_header "Infrastructure Ready! (${elapsed}s)"

    echo -e "  ${GREEN}Docker Services:${NC}"
    echo -e "    Redis:        ${BLUE}localhost:6379${NC}"
    echo -e "    MinIO:        ${BLUE}localhost:9000${NC} (Console: ${BLUE}localhost:9001${NC})"
    echo ""
    echo -e "  ${GREEN}Supabase Services:${NC}"
    echo -e "    API:          ${BLUE}localhost:${SUPABASE_API_PORT}${NC}"
    echo -e "    PostgreSQL:   ${BLUE}localhost:${SUPABASE_DB_PORT}${NC}"
    echo -e "    Studio:       ${BLUE}localhost:${SUPABASE_STUDIO_PORT}${NC}"
    echo -e "    Inbucket:     ${BLUE}localhost:54324${NC} (dev emails)"
    echo ""

    # Show Docker disk usage
    echo -e "  ${GREEN}Docker Disk Usage:${NC}"
    docker system df --format '    {{.Type}}: {{.Size}} ({{.Reclaimable}} reclaimable)' 2>/dev/null || true
    echo ""

    if [[ $WARNINGS -gt 0 ]]; then
        echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
        echo ""
    fi

    echo -e "  ${CYAN}Next step:${NC} Run ${GREEN}pnpm dev${NC} to start the applications"
    echo ""
}

show_failure_summary() {
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  Startup Failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Failed during: ${BOLD}$CURRENT_STEP${NC}"
    echo ""
    echo -e "  ${CYAN}Quick fixes:${NC}"
    echo -e "    ${GREEN}pnpm infra:up --clean${NC}     Clean up and retry"
    echo -e "    ${GREEN}pnpm infra:down -r -f${NC}     Full reset"
    echo ""
    echo -e "  ${CYAN}For more details:${NC}"
    echo -e "    ${GREEN}pnpm infra:up -v${NC}          Run with verbose output"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_args "$@"

    print_header "Life Assistant - Dev Infrastructure"

    local start_time=$SECONDS

    # Pre-flight checks
    check_docker
    check_docker_compose_file
    check_supabase_config
    ensure_supabase_cli
    check_ports

    # Clean mode: stop everything first
    if [[ "$CLEAN_MODE" == "true" ]]; then
        print_header "Cleanup Mode"
        force_stop_running
        cleanup_zombie_containers
    else
        # Just clean up zombies
        cleanup_zombie_containers
    fi

    echo ""

    # Start services with error handling
    if ! start_docker_services; then
        show_failure_summary
        exit 1
    fi

    if ! start_supabase; then
        show_failure_summary
        exit 1
    fi

    show_supabase_status

    # Cleanup old images and build cache
    cleanup_old_supabase_images
    cleanup_build_cache

    apply_database_schema

    local elapsed=$((SECONDS - start_time))

    # Final summary
    if [[ $ERRORS -eq 0 ]]; then
        show_summary "$elapsed"
    else
        show_failure_summary
        exit 1
    fi
}

# Run main function
main "$@"
