#!/usr/bin/env bash
# =============================================================================
# dev-stop.sh - Stop development infrastructure
# Compatible with: bash, zsh
#
# Usage:
#   ./dev-stop.sh           Stop services, preserve data
#   ./dev-stop.sh --reset   Stop services and DELETE ALL DATA
#   ./dev-stop.sh --help    Show help
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
DEFAULT_CONTAINER_TIMEOUT=10
DEFAULT_SUPABASE_TIMEOUT=30
DEFAULT_DOCKER_COMPOSE_TIMEOUT=30
DEFAULT_VOLUME_TIMEOUT=10

CONTAINER_TIMEOUT=$DEFAULT_CONTAINER_TIMEOUT
SUPABASE_TIMEOUT=$DEFAULT_SUPABASE_TIMEOUT
DOCKER_COMPOSE_TIMEOUT=$DEFAULT_DOCKER_COMPOSE_TIMEOUT
VOLUME_TIMEOUT=$DEFAULT_VOLUME_TIMEOUT

# Operation modes
RESET_MODE=false
FORCE_MODE=false
VERBOSE_MODE=false

# Track errors and timing
ERRORS=0
WARNINGS=0
STEP_START=0

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
    local step_name=$1
    STEP_START=$SECONDS
    print_info "${step_name}..."
}

# End timing a step
end_step() {
    local elapsed=$((SECONDS - STEP_START))
    print_debug "Completed in ${elapsed}s"
}

# Run command with timeout and logging
run_with_timeout() {
    local timeout_sec=$1
    local description=$2
    shift 2

    print_verbose "Running: $* (timeout: ${timeout_sec}s)"

    local output
    local exit_code=0

    if output=$(timeout "$timeout_sec" "$@" 2>&1); then
        print_verbose "Success: $description"
        return 0
    else
        exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            print_warning "Timeout after ${timeout_sec}s: $description"
            print_verbose "Output: $output"
            return 124
        else
            print_verbose "Failed (exit $exit_code): $description"
            print_verbose "Output: $output"
            return $exit_code
        fi
    fi
}

# Show spinner while waiting
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

# =============================================================================
# Help & Usage
# =============================================================================

show_help() {
    cat << EOF
${BOLD}Life Assistant - Stop Infrastructure${NC}

${BOLD}USAGE${NC}
    pnpm infra:down [OPTIONS]

${BOLD}OPTIONS${NC}
    ${GREEN}--reset, -r${NC}   Delete all data and volumes (PostgreSQL, Redis, MinIO)
                  This is a ${RED}DESTRUCTIVE${NC} operation that cannot be undone.
                  Requires confirmation unless --force is used.

    ${GREEN}--force, -f${NC}   Skip confirmation prompts (use with caution)

    ${GREEN}--timeout, -t${NC} N
                  Set timeout for operations in seconds (default: 30)

    ${GREEN}--verbose, -v${NC} Show detailed debug output

    ${GREEN}--help, -h${NC}    Show this help message

${BOLD}TIMEOUTS${NC}
    The script uses timeouts to prevent hanging:
      • Container stop: ${DEFAULT_CONTAINER_TIMEOUT}s per container
      • Supabase stop:  ${DEFAULT_SUPABASE_TIMEOUT}s total
      • Docker Compose: ${DEFAULT_DOCKER_COMPOSE_TIMEOUT}s total
      • Volume removal: ${DEFAULT_VOLUME_TIMEOUT}s per volume

    If operations timeout, the script will force-kill containers.

${BOLD}EXAMPLES${NC}
    ${GRAY}# Stop services, keep all data${NC}
    pnpm infra:down

    ${GRAY}# Stop and delete everything (with confirmation)${NC}
    pnpm infra:down --reset

    ${GRAY}# Stop and delete everything (no confirmation, for CI)${NC}
    pnpm infra:down --reset --force

    ${GRAY}# Stop with longer timeout (60s) and verbose output${NC}
    pnpm infra:down --timeout 60 --verbose

${BOLD}TROUBLESHOOTING${NC}
    If the script hangs or fails, try:
      ${CYAN}docker stop \$(docker ps -q --filter name=supabase)${NC}
      ${CYAN}docker stop \$(docker ps -q --filter name=life-assistant)${NC}
      ${CYAN}docker rm \$(docker ps -aq --filter name=supabase)${NC}
      ${CYAN}docker rm \$(docker ps -aq --filter name=life-assistant)${NC}

EOF
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --reset|-r)
                RESET_MODE=true
                shift
                ;;
            --force|-f)
                FORCE_MODE=true
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
                CONTAINER_TIMEOUT=$2
                SUPABASE_TIMEOUT=$2
                DOCKER_COMPOSE_TIMEOUT=$2
                VOLUME_TIMEOUT=$2
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

    # Validate: --force without --reset is meaningless
    if [[ "$FORCE_MODE" == "true" && "$RESET_MODE" == "false" ]]; then
        print_warning "--force has no effect without --reset"
    fi
}

# =============================================================================
# Reset Confirmation
# =============================================================================

confirm_reset() {
    if [[ "$FORCE_MODE" == "true" ]]; then
        print_warning "Force mode enabled, skipping confirmation"
        return 0
    fi

    echo ""
    echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}${BOLD}  ⚠️  DESTRUCTIVE OPERATION${NC}"
    echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "This will ${RED}PERMANENTLY DELETE${NC}:"
    echo ""
    echo -e "  ${RED}•${NC} PostgreSQL database (all tables, migrations, users)"
    echo -e "  ${RED}•${NC} Redis cache (all cached data, sessions)"
    echo -e "  ${RED}•${NC} MinIO storage (all uploaded files)"
    echo -e "  ${RED}•${NC} Supabase local data (auth users, storage)"
    echo ""
    echo -e "${YELLOW}This action CANNOT be undone.${NC}"
    echo ""

    # Interactive confirmation
    echo -ne "Type ${BOLD}'yes'${NC} to confirm: "
    read -r confirmation

    if [[ "$confirmation" != "yes" ]]; then
        echo ""
        print_info "Operation cancelled"
        exit 0
    fi

    echo ""
    print_warning "Proceeding with data deletion..."
    echo ""
}

# =============================================================================
# Container Discovery
# =============================================================================

get_supabase_containers() {
    docker ps -q --filter "name=supabase" 2>/dev/null || true
}

get_supabase_container_names() {
    docker ps --filter "name=supabase" --format "{{.Names}}" 2>/dev/null || true
}

get_docker_compose_containers() {
    # Only get life-assistant containers that are NOT supabase
    docker ps -q --filter "name=life-assistant" 2>/dev/null | while read -r id; do
        local name
        name=$(docker inspect --format '{{.Name}}' "$id" 2>/dev/null | sed 's/^\///')
        if [[ ! "$name" =~ ^supabase ]]; then
            echo "$id"
        fi
    done
}

get_docker_compose_container_names() {
    # Only get life-assistant containers that are NOT supabase (Redis, MinIO)
    docker ps --filter "name=life-assistant" --format "{{.Names}}" 2>/dev/null | grep -v "^supabase" || true
}

get_all_containers() {
    docker ps -aq --filter "name=supabase" --filter "name=life-assistant" 2>/dev/null || true
}

check_supabase_running() {
    [[ -n "$(get_supabase_containers)" ]]
}

check_docker_services_running() {
    [[ -n "$(get_docker_compose_containers)" ]]
}

get_supabase_volumes() {
    docker volume ls --format "{{.Name}}" 2>/dev/null | grep -E "supabase" || true
}

get_docker_compose_volumes() {
    docker volume ls --format "{{.Name}}" 2>/dev/null | grep -E "^(docker|life-assistant)_(redis|minio|postgres)_data$" || true
}

# =============================================================================
# Container Status Display
# =============================================================================

show_container_status() {
    local containers
    containers=$(get_supabase_container_names)
    local dc_containers
    dc_containers=$(get_docker_compose_container_names)

    local supabase_count=0
    local dc_count=0

    if [[ -n "$containers" ]]; then
        supabase_count=$(echo "$containers" | wc -l | tr -d ' ')
    fi

    if [[ -n "$dc_containers" ]]; then
        dc_count=$(echo "$dc_containers" | wc -l | tr -d ' ')
    fi

    local total=$((supabase_count + dc_count))

    if [[ $total -eq 0 ]]; then
        print_info "No containers running"
        return 1
    fi

    print_info "Found ${BOLD}$total${NC} containers to stop:"

    if [[ $supabase_count -gt 0 ]]; then
        print_debug "Supabase: $supabase_count containers"
        if [[ "$VERBOSE_MODE" == "true" ]]; then
            echo "$containers" | while read -r name; do
                print_verbose "  - $name"
            done
        fi
    fi

    if [[ $dc_count -gt 0 ]]; then
        print_debug "Docker Compose: $dc_count containers (Redis, MinIO)"
        if [[ "$VERBOSE_MODE" == "true" ]]; then
            echo "$dc_containers" | while read -r name; do
                print_verbose "  - $name"
            done
        fi
    fi

    return 0
}

# =============================================================================
# Service Management - Stop Operations
# =============================================================================

stop_container_gracefully() {
    local container_id=$1
    local container_name=$2
    local timeout=$3

    print_verbose "Stopping $container_name (timeout: ${timeout}s)"

    if docker stop -t "$timeout" "$container_id" &>/dev/null; then
        print_verbose "Stopped: $container_name"
        return 0
    else
        print_verbose "Failed to stop gracefully: $container_name"
        return 1
    fi
}

force_kill_container() {
    local container_id=$1
    local container_name=$2

    print_verbose "Force killing: $container_name"

    if docker kill "$container_id" &>/dev/null; then
        print_verbose "Killed: $container_name"
        return 0
    else
        print_verbose "Failed to kill: $container_name"
        return 1
    fi
}

remove_container() {
    local container_id=$1

    docker rm -f "$container_id" &>/dev/null || true
}

stop_supabase_via_cli() {
    print_header "Step 1/3: Stopping Supabase"

    if ! check_supabase_running; then
        print_success "Supabase is not running"
        return 0
    fi

    local container_count
    container_count=$(get_supabase_containers | wc -l | tr -d ' ')
    print_info "Stopping $container_count Supabase containers..."

    # Try graceful stop via Supabase CLI first
    start_step "Attempting graceful stop via Supabase CLI"

    local stop_args=""
    if [[ "$RESET_MODE" == "true" ]]; then
        stop_args="--no-backup"
    fi

    print_debug "Command: npx -y supabase stop $stop_args"

    # Run in background with timeout
    (timeout "$SUPABASE_TIMEOUT" npx -y supabase stop $stop_args &>/dev/null) &
    local pid=$!

    if show_progress $pid "Supabase CLI stop" "$SUPABASE_TIMEOUT"; then
        end_step
        print_success "Supabase stopped via CLI"
        return 0
    else
        end_step
        print_warning "Supabase CLI timed out or failed, using Docker directly"
    fi

    # Fallback: Stop containers directly via Docker
    stop_containers_directly "supabase"
}

stop_docker_services() {
    print_header "Step 2/3: Stopping Docker Services (Redis + MinIO)"

    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_warning "Docker Compose file not found, skipping..."
        return 0
    fi

    if ! check_docker_services_running; then
        print_success "Docker services are not running"
        return 0
    fi

    local container_count
    container_count=$(get_docker_compose_containers | wc -l | tr -d ' ')
    print_info "Stopping $container_count Docker Compose containers..."

    start_step "Running docker compose down"

    local down_args=""
    if [[ "$RESET_MODE" == "true" ]]; then
        down_args="-v --remove-orphans"
        print_debug "Command: docker compose down -v --remove-orphans"
    else
        down_args="--remove-orphans"
        print_debug "Command: docker compose down --remove-orphans"
    fi

    # Run in background with timeout
    (timeout "$DOCKER_COMPOSE_TIMEOUT" docker compose -f "$DOCKER_COMPOSE_FILE" down $down_args &>/dev/null) &
    local pid=$!

    if show_progress $pid "docker compose down" "$DOCKER_COMPOSE_TIMEOUT"; then
        end_step
        print_success "Docker services stopped"
        return 0
    else
        end_step
        print_warning "Docker compose timed out, stopping containers directly"
    fi

    # Fallback: Stop containers directly
    stop_containers_directly "life-assistant"
}

stop_containers_directly() {
    local filter=$1
    local containers
    containers=$(docker ps -q --filter "name=$filter" 2>/dev/null || true)

    if [[ -z "$containers" ]]; then
        print_debug "No $filter containers found"
        return 0
    fi

    local count
    count=$(echo "$containers" | wc -l | tr -d ' ')
    print_info "Force stopping $count $filter containers..."

    local stopped=0
    local killed=0
    local failed=0

    while read -r container_id; do
        [[ -z "$container_id" ]] && continue

        local container_name
        container_name=$(docker inspect --format '{{.Name}}' "$container_id" 2>/dev/null | sed 's/^\///')

        # Try graceful stop with short timeout
        if timeout "$CONTAINER_TIMEOUT" docker stop -t 5 "$container_id" &>/dev/null; then
            stopped=$((stopped + 1))
            print_debug "Stopped: $container_name"
        else
            # Force kill
            if docker kill "$container_id" &>/dev/null; then
                killed=$((killed + 1))
                print_debug "Killed: $container_name"
            else
                failed=$((failed + 1))
                print_warning "Failed to stop: $container_name"
            fi
        fi

        # Remove container
        docker rm -f "$container_id" &>/dev/null || true

    done <<< "$containers"

    if [[ $failed -eq 0 ]]; then
        print_success "All $filter containers stopped (graceful: $stopped, forced: $killed)"
    else
        print_warning "Some containers failed to stop (stopped: $stopped, killed: $killed, failed: $failed)"
    fi
}

# =============================================================================
# Reset Mode - Volume Cleanup
# =============================================================================

remove_volumes() {
    print_header "Step 3/3: Removing Data Volumes"

    local supabase_volumes
    local dc_volumes
    supabase_volumes=$(get_supabase_volumes)
    dc_volumes=$(get_docker_compose_volumes)

    local all_volumes="$supabase_volumes"$'\n'"$dc_volumes"
    all_volumes=$(echo "$all_volumes" | grep -v '^$' | sort -u || true)

    if [[ -z "$all_volumes" ]]; then
        print_success "No volumes to remove"
        return 0
    fi

    local count
    count=$(echo "$all_volumes" | wc -l | tr -d ' ')
    print_info "Removing $count data volumes..."

    local removed=0
    local failed=0

    while read -r vol; do
        [[ -z "$vol" ]] && continue

        print_debug "Removing volume: $vol"

        if timeout "$VOLUME_TIMEOUT" docker volume rm "$vol" &>/dev/null; then
            removed=$((removed + 1))
            print_verbose "Removed: $vol"
        else
            failed=$((failed + 1))
            print_warning "Could not remove: $vol (may be in use)"
        fi
    done <<< "$all_volumes"

    if [[ $failed -eq 0 ]]; then
        print_success "All volumes removed ($removed total)"
    else
        print_warning "Volume cleanup partial ($removed removed, $failed failed)"
        print_debug "Run 'docker volume prune' to clean up orphaned volumes"
    fi
}

cleanup_supabase_cache() {
    local supabase_dir="$PROJECT_ROOT/supabase/.temp"

    if [[ -d "$supabase_dir" ]]; then
        print_info "Cleaning Supabase local cache..."
        rm -rf "$supabase_dir" 2>/dev/null || true
        print_debug "Removed: $supabase_dir"
    fi
}

# =============================================================================
# Verification
# =============================================================================

verify_stopped() {
    print_header "Verification"

    local any_running=false

    # Check containers
    local remaining
    remaining=$(docker ps --filter "name=supabase" --filter "name=life-assistant" --format "{{.Names}}" 2>/dev/null || true)

    if [[ -n "$remaining" ]]; then
        any_running=true
        local count
        count=$(echo "$remaining" | wc -l | tr -d ' ')
        print_warning "$count containers still running:"
        echo "$remaining" | while read -r name; do
            print_debug "$name"
        done
    else
        print_success "All containers stopped"
    fi

    # In reset mode, verify volumes
    if [[ "$RESET_MODE" == "true" ]]; then
        local remaining_volumes
        remaining_volumes=$(get_supabase_volumes)
        remaining_volumes+=$'\n'$(get_docker_compose_volumes)
        remaining_volumes=$(echo "$remaining_volumes" | grep -v '^$' | sort -u || true)

        if [[ -n "$remaining_volumes" ]]; then
            local vol_count
            vol_count=$(echo "$remaining_volumes" | wc -l | tr -d ' ')
            print_warning "$vol_count volumes still exist:"
            echo "$remaining_volumes" | while read -r vol; do
                [[ -n "$vol" ]] && print_debug "$vol"
            done
        else
            print_success "All data volumes removed"
        fi
    fi

    if [[ "$any_running" == "true" ]]; then
        return 1
    fi
    return 0
}

show_manual_cleanup() {
    echo ""
    print_info "Manual cleanup commands if needed:"
    echo ""
    echo -e "  ${CYAN}# Force stop all project containers${NC}"
    echo -e "  docker stop \$(docker ps -q --filter name=supabase --filter name=life-assistant)"
    echo ""
    echo -e "  ${CYAN}# Remove all project containers${NC}"
    echo -e "  docker rm -f \$(docker ps -aq --filter name=supabase --filter name=life-assistant)"
    echo ""
    echo -e "  ${CYAN}# Remove all project volumes${NC}"
    echo -e "  docker volume rm \$(docker volume ls -q | grep -E 'supabase|life-assistant|redis|minio')"
    echo ""
    echo -e "  ${CYAN}# Nuclear option - prune everything unused${NC}"
    echo -e "  docker system prune -af --volumes"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_args "$@"

    local total_start=$SECONDS

    # Show appropriate header
    if [[ "$RESET_MODE" == "true" ]]; then
        print_header "Life Assistant - Reset Infrastructure"
        confirm_reset
    else
        print_header "Life Assistant - Stopping Infrastructure"
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_warning "Docker is not running - nothing to stop"
        exit 0
    fi

    # Show current status
    if ! show_container_status; then
        if [[ "$RESET_MODE" == "true" ]]; then
            print_info "Checking for volumes to remove..."
            remove_volumes
            cleanup_supabase_cache
        fi
        print_success "Nothing to do"
        exit 0
    fi

    echo ""

    # Stop services
    stop_supabase_via_cli
    stop_docker_services

    # In reset mode, clean up volumes
    if [[ "$RESET_MODE" == "true" ]]; then
        remove_volumes
        cleanup_supabase_cache
    fi

    # Verify everything is stopped
    if ! verify_stopped; then
        show_manual_cleanup
    fi

    local total_elapsed=$((SECONDS - total_start))

    # Final summary
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [[ $ERRORS -eq 0 ]]; then
        if [[ "$RESET_MODE" == "true" ]]; then
            echo -e "${GREEN}  ✓ Infrastructure reset complete! (${total_elapsed}s)${NC}"
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            print_info "All data deleted. Run ${GREEN}pnpm infra:up${NC} to start fresh."
        else
            echo -e "${GREEN}  ✓ All services stopped! (${total_elapsed}s)${NC}"
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            print_info "Data preserved. Run ${GREEN}pnpm infra:up${NC} to restart."
        fi
    else
        echo -e "${YELLOW}  ⚠ Completed with $ERRORS error(s), $WARNINGS warning(s) (${total_elapsed}s)${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        show_manual_cleanup
    fi

    echo ""
    exit $ERRORS
}

# Run main function with all arguments
main "$@"
