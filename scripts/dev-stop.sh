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
readonly GRAY='\033[0;90m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly DOCKER_COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.yml"

# Timeouts (in seconds)
readonly SUPABASE_STOP_TIMEOUT=60

# Operation modes
RESET_MODE=false
FORCE_MODE=false

# Track errors
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

# =============================================================================
# Help & Usage
# =============================================================================

show_help() {
    cat << EOF
${BOLD}Life Assistant - Stop Infrastructure${NC}

${BOLD}USAGE${NC}
    pnpm infra:down [OPTIONS]

${BOLD}OPTIONS${NC}
    ${GREEN}--reset${NC}     Delete all data and volumes (PostgreSQL, Redis, MinIO)
                This is a ${RED}DESTRUCTIVE${NC} operation that cannot be undone.
                Requires confirmation unless --force is used.

    ${GREEN}--force${NC}     Skip confirmation prompts (use with caution)
    ${GREEN}-f${NC}          Alias for --force

    ${GREEN}--help${NC}      Show this help message
    ${GREEN}-h${NC}          Alias for --help

${BOLD}EXAMPLES${NC}
    ${GRAY}# Stop services, keep all data${NC}
    pnpm infra:down

    ${GRAY}# Stop and delete everything (with confirmation)${NC}
    pnpm infra:down --reset

    ${GRAY}# Stop and delete everything (no confirmation, for CI)${NC}
    pnpm infra:down --reset --force

${BOLD}DATA PRESERVATION${NC}
    ${GREEN}Without --reset:${NC}
      • Containers are stopped and removed
      • Docker volumes are ${GREEN}PRESERVED${NC}
      • Database data persists between restarts
      • Redis cache persists between restarts
      • MinIO files persist between restarts

    ${RED}With --reset:${NC}
      • Containers are stopped and removed
      • Docker volumes are ${RED}DELETED${NC}
      • PostgreSQL database is ${RED}WIPED${NC}
      • Redis cache is ${RED}CLEARED${NC}
      • MinIO storage is ${RED}EMPTIED${NC}

EOF
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --reset)
                RESET_MODE=true
                shift
                ;;
            --force|-f)
                FORCE_MODE=true
                shift
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
# Service Detection
# =============================================================================

check_supabase_running() {
    if docker ps --filter "name=supabase" --format "{{.Names}}" 2>/dev/null | grep -q "supabase"; then
        return 0
    fi
    return 1
}

check_docker_services_running() {
    if docker ps --filter "name=life-assistant" --format "{{.Names}}" 2>/dev/null | grep -q "life-assistant"; then
        return 0
    fi
    return 1
}

get_supabase_volumes() {
    # Get all volumes related to supabase
    docker volume ls --format "{{.Name}}" 2>/dev/null | grep -E "supabase" || true
}

get_docker_compose_volumes() {
    # Get volumes from our docker-compose
    # Matches both old format (docker_*) and new format (life-assistant_*)
    # Anchors ^ and $ ensure exact matching for safety (prevents matching other projects)
    docker volume ls --format "{{.Name}}" 2>/dev/null | grep -E "^(docker|life-assistant)_(redis|minio|postgres)_data$" || true
}

# =============================================================================
# Service Management - Normal Stop
# =============================================================================

stop_supabase() {
    print_header "Stopping Supabase"

    if ! check_supabase_running; then
        print_warning "Supabase is not running (or already stopped)"
        return 0
    fi

    print_info "Stopping Supabase services..."

    local stop_args=""
    if [[ "$RESET_MODE" == "true" ]]; then
        stop_args="--no-backup"
        print_debug "Command: npx -y supabase stop --no-backup (timeout: ${SUPABASE_STOP_TIMEOUT}s)"
    else
        print_debug "Command: npx -y supabase stop (timeout: ${SUPABASE_STOP_TIMEOUT}s)"
    fi

    local stop_output
    if stop_output=$(timeout "$SUPABASE_STOP_TIMEOUT" npx -y supabase stop $stop_args 2>&1); then
        print_success "Supabase stopped successfully"
    else
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            print_error "Supabase stop timed out after ${SUPABASE_STOP_TIMEOUT}s"
            print_debug "Attempting force stop via Docker..."
            force_stop_supabase
        else
            print_error "Failed to stop Supabase cleanly (exit code: $exit_code)"
            echo "$stop_output" | tail -10
            print_debug "Attempting force stop via Docker..."
            force_stop_supabase
        fi
    fi
}

force_stop_supabase() {
    local containers
    containers=$(docker ps -q --filter "name=supabase" 2>/dev/null || true)

    if [[ -n "$containers" ]]; then
        print_info "Force stopping Supabase containers..."
        if docker stop $containers 2>/dev/null; then
            print_success "Supabase containers force stopped"
            # Also remove them
            docker rm $containers 2>/dev/null || true
        else
            print_error "Failed to force stop some containers"
            ERRORS=$((ERRORS + 1))
        fi
    fi
}

stop_docker_services() {
    print_header "Stopping Docker Services (Redis + MinIO)"

    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_warning "Docker Compose file not found, skipping..."
        return 0
    fi

    if ! check_docker_services_running; then
        print_warning "No Docker services running"

        # Even if containers aren't running, we might need to remove volumes in reset mode
        if [[ "$RESET_MODE" == "true" ]]; then
            remove_docker_compose_volumes
        fi
        return 0
    fi

    print_info "Stopping containers..."

    local down_args=""
    if [[ "$RESET_MODE" == "true" ]]; then
        down_args="-v"
        print_debug "Command: docker compose down -v (removing volumes)"
    else
        print_debug "Command: docker compose down"
    fi

    if docker compose -f "$DOCKER_COMPOSE_FILE" down $down_args 2>&1; then
        print_success "Docker services stopped successfully"
        if [[ "$RESET_MODE" == "true" ]]; then
            print_success "Docker volumes removed"
        fi
    else
        print_error "Failed to stop Docker services cleanly"
        print_debug "Attempting force stop..."
        force_stop_docker_services
    fi
}

force_stop_docker_services() {
    local containers
    containers=$(docker ps -q --filter "name=life-assistant" 2>/dev/null || true)

    if [[ -n "$containers" ]]; then
        docker stop $containers 2>/dev/null || true
        docker rm $containers 2>/dev/null || true
    fi

    if [[ "$RESET_MODE" == "true" ]]; then
        remove_docker_compose_volumes
    fi

    ERRORS=$((ERRORS + 1))
}

# =============================================================================
# Reset Mode - Volume Cleanup
# =============================================================================

remove_docker_compose_volumes() {
    print_info "Removing Docker Compose volumes..."

    local volumes
    volumes=$(get_docker_compose_volumes)

    if [[ -z "$volumes" ]]; then
        print_debug "No Docker Compose volumes found"
        return 0
    fi

    for vol in $volumes; do
        if docker volume rm "$vol" 2>/dev/null; then
            print_debug "Removed volume: $vol"
        else
            print_warning "Could not remove volume: $vol (may be in use)"
        fi
    done
}

remove_supabase_volumes() {
    print_header "Removing Supabase Data"

    print_info "Removing Supabase Docker volumes..."

    local volumes
    volumes=$(get_supabase_volumes)

    if [[ -z "$volumes" ]]; then
        print_debug "No Supabase volumes found"
        print_success "Supabase data cleaned"
        return 0
    fi

    local removed=0
    local failed=0

    for vol in $volumes; do
        if docker volume rm "$vol" 2>/dev/null; then
            print_debug "Removed volume: $vol"
            removed=$((removed + 1))
        else
            print_warning "Could not remove volume: $vol"
            failed=$((failed + 1))
        fi
    done

    if [[ $failed -eq 0 ]]; then
        print_success "Supabase data cleaned ($removed volumes removed)"
    else
        print_warning "Supabase data partially cleaned ($removed removed, $failed failed)"
        ERRORS=$((ERRORS + 1))
    fi
}

cleanup_supabase_cache() {
    # Clean local supabase cache if it exists
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
    print_header "Verifying Cleanup"

    local any_issues=false

    # Check containers
    local la_containers
    la_containers=$(docker ps --filter "name=life-assistant" --format "{{.Names}}" 2>/dev/null || true)

    if [[ -n "$la_containers" ]]; then
        any_issues=true
        print_warning "Some life-assistant containers still running:"
        echo "$la_containers" | while read -r container; do
            print_debug "$container"
        done
        ERRORS=$((ERRORS + 1))
    else
        print_success "All life-assistant containers stopped"
    fi

    local supabase_containers
    supabase_containers=$(docker ps --filter "name=supabase" --format "{{.Names}}" 2>/dev/null || true)

    if [[ -n "$supabase_containers" ]]; then
        any_issues=true
        print_warning "Some Supabase containers still running:"
        echo "$supabase_containers" | while read -r container; do
            print_debug "$container"
        done
        ERRORS=$((ERRORS + 1))
    else
        print_success "All Supabase containers stopped"
    fi

    # In reset mode, also verify volumes are gone
    if [[ "$RESET_MODE" == "true" ]]; then
        local remaining_volumes
        remaining_volumes=$(get_supabase_volumes)
        remaining_volumes+=$(get_docker_compose_volumes)

        if [[ -n "$remaining_volumes" ]]; then
            any_issues=true
            print_warning "Some volumes still exist (may need manual cleanup):"
            echo "$remaining_volumes" | while read -r vol; do
                [[ -n "$vol" ]] && print_debug "$vol"
            done
        else
            print_success "All data volumes removed"
        fi
    fi

    # Show total container count
    if [[ "$any_issues" == "false" ]]; then
        local total
        total=$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')
        print_debug "Total running containers (other projects): $total"
    fi
}

show_cleanup_commands() {
    if [[ $ERRORS -gt 0 ]]; then
        echo ""
        print_info "Manual cleanup commands if needed:"
        print_debug "docker stop \$(docker ps -q --filter name=supabase)"
        print_debug "docker stop \$(docker ps -q --filter name=life-assistant)"
        print_debug "docker volume rm \$(docker volume ls -q | grep -E 'supabase|redis|minio')"
        print_debug "docker system prune -f"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    # Parse command line arguments
    parse_args "$@"

    # Show appropriate header
    if [[ "$RESET_MODE" == "true" ]]; then
        print_header "Life Assistant - Reset Infrastructure"
        confirm_reset
    else
        print_header "Life Assistant - Stopping Infrastructure"
    fi

    local start_time=$SECONDS

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_warning "Docker is not running - nothing to stop"
        exit 0
    fi

    # Stop services (Supabase first, then Docker)
    stop_supabase
    stop_docker_services

    # In reset mode, also clean up Supabase volumes and cache
    if [[ "$RESET_MODE" == "true" ]]; then
        remove_supabase_volumes
        cleanup_supabase_cache
    fi

    # Verify everything is cleaned up
    verify_stopped

    local elapsed=$((SECONDS - start_time))

    # Final summary
    echo ""
    if [[ $ERRORS -eq 0 ]]; then
        if [[ "$RESET_MODE" == "true" ]]; then
            print_success "Infrastructure reset complete! All data deleted. (${elapsed}s)"
            echo ""
            print_info "Run ${GREEN}pnpm infra:up${NC} to start fresh"
        else
            print_success "All services stopped successfully! (${elapsed}s)"
            echo ""
            print_info "Data preserved. Run ${GREEN}pnpm infra:up${NC} to restart"
        fi
    else
        print_warning "Completed with $ERRORS warning(s). (${elapsed}s)"
        show_cleanup_commands
    fi
    echo ""

    exit $ERRORS
}

# Run main function with all arguments
main "$@"
