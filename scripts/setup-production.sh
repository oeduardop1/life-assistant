#!/usr/bin/env bash
# =============================================================================
# setup-production.sh - Configure production environment variables
# Compatible with: bash, zsh
#
# Usage:
#   ./setup-production.sh              Start full setup
#   ./setup-production.sh --help       Show help
#   ./setup-production.sh --dry-run    Preview without executing
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
readonly PROGRESS_FILE="$PROJECT_ROOT/.setup-progress.json"

# Documentation URLs
readonly SUPABASE_DASHBOARD="https://supabase.com/dashboard/projects"
readonly VERCEL_TOKENS="https://vercel.com/account/tokens"
readonly RAILWAY_TOKENS="https://railway.com/account/tokens"
readonly SENTRY_TOKENS="https://sentry.io/settings/developer-settings/"

# Modes
DRY_RUN=false
FORCE_OVERWRITE=false
CHECK_ONLY=false
RESUME_MODE=false
VERCEL_ONLY=false
RAILWAY_ONLY=false
GITHUB_ONLY=false

# Configuration storage
declare -A CONFIG

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

print_step() {
    local step=$1
    local total=$2
    local title=$3
    echo ""
    echo -e "${CYAN}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${BOLD}Step ${step}/${total}: ${title}${NC}"
    echo -e "${CYAN}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

print_substep() {
    echo -e "  ${BOLD}▸${NC} $1"
}

# Read input with optional default value
# Stores result in CONFIG[$var_name] - access it after calling
read_input() {
    local prompt=$1
    local default=${2:-}
    local var_name=$3
    local value

    if [[ -n "$default" ]]; then
        echo -ne "    ${prompt} [${GRAY}${default}${NC}]: "
    else
        echo -ne "    ${prompt}: "
    fi

    read -r value
    # Remove carriage returns (from Windows copy/paste) and trim whitespace
    value=$(echo "$value" | tr -d '\r' | xargs)
    value="${value:-$default}"
    CONFIG[$var_name]="$value"
}

# Read secret input (visible - user is configuring their own environment)
# Stores result in CONFIG[$var_name] - access it after calling
read_secret() {
    local prompt=$1
    local var_name=$2
    local value

    echo -ne "    ${prompt}: "
    read -r value
    # Remove carriage returns (from Windows copy/paste) and trim whitespace
    value=$(echo "$value" | tr -d '\r' | xargs)
    CONFIG[$var_name]="$value"
}

# Confirm action (Y/n)
confirm() {
    local prompt=$1
    local default=${2:-n}
    local response

    if [[ "$default" == "y" ]]; then
        echo -ne "${prompt} [Y/n]: "
    else
        echo -ne "${prompt} [y/N]: "
    fi

    read -r response
    response="${response:-$default}"

    [[ "$response" =~ ^[Yy]$ ]]
}

# =============================================================================
# Validation Functions
# =============================================================================

validate_url() {
    local url=$1
    if [[ "$url" =~ ^https:// ]]; then
        return 0
    fi
    return 1
}

validate_sentry_dsn() {
    local dsn=$1
    # Format: https://key@org.ingest.sentry.io/project
    if [[ "$dsn" =~ ^https://.*@.*\.sentry\.io/.* ]]; then
        return 0
    fi
    return 1
}

validate_supabase_key() {
    local key=$1
    # JWT format starts with eyJ or new format starts with sb_
    if [[ "$key" =~ ^eyJ ]] || [[ "$key" =~ ^sb_ ]]; then
        return 0
    fi
    return 1
}

validate_database_url() {
    local url=$1
    if [[ "$url" =~ ^postgres(ql)?:// ]]; then
        return 0
    fi
    return 1
}

validate_redis_url() {
    local url=$1
    if [[ "$url" =~ ^rediss?:// ]]; then
        return 0
    fi
    return 1
}

validate_required() {
    local value=$1
    [[ -n "$value" ]]
}

# =============================================================================
# CLI Detection Functions
# =============================================================================

check_cli_installed() {
    local cli=$1
    local install_url=$2

    if ! command -v "$cli" &> /dev/null; then
        print_error "$cli CLI is not installed"
        print_debug "Install: $install_url"
        return 1
    fi
    return 0
}

check_vercel_login() {
    if vercel whoami &> /dev/null; then
        local user
        user=$(vercel whoami 2>/dev/null)
        print_success "Logged in to Vercel as: ${BOLD}$user${NC}"
        return 0
    fi
    return 1
}

check_railway_login() {
    if railway whoami &> /dev/null; then
        local user
        user=$(railway whoami 2>/dev/null | head -1)
        print_success "Logged in to Railway as: ${BOLD}$user${NC}"
        return 0
    fi
    return 1
}

check_gh_cli() {
    if gh auth status &> /dev/null; then
        print_success "GitHub CLI authenticated"
        return 0
    fi
    return 1
}

# =============================================================================
# Existing Variable Detection
# =============================================================================

check_vercel_env_exists() {
    local var_name=$1
    vercel env ls 2>/dev/null | grep -q "^$var_name" 2>/dev/null
}

check_railway_var_exists() {
    local var_name=$1
    if command -v jq &> /dev/null; then
        railway variables --json 2>/dev/null | jq -e ".[\"$var_name\"]" > /dev/null 2>&1
    else
        railway variables 2>/dev/null | grep -q "^$var_name=" 2>/dev/null
    fi
}

check_github_secret_exists() {
    local secret_name=$1
    if command -v jq &> /dev/null; then
        gh secret list --json name 2>/dev/null | jq -e ".[] | select(.name == \"$secret_name\")" > /dev/null 2>&1
    else
        gh secret list 2>/dev/null | grep -q "^$secret_name" 2>/dev/null
    fi
}

# =============================================================================
# Progress/Resume Functions
# =============================================================================

save_progress() {
    local step=$1
    local status=$2

    if command -v jq &> /dev/null; then
        local config_json
        config_json=$(declare -p CONFIG | sed "s/declare -A CONFIG=//" | tr -d "()" | tr " " "\n" | grep "=" | while read -r line; do
            key="${line%%=*}"
            key="${key#[}"
            key="${key%]}"
            value="${line#*=}"
            value="${value#\"}"
            value="${value%\"}"
            echo "\"$key\": \"$value\""
        done | paste -sd "," -)

        cat > "$PROGRESS_FILE" << EOF
{
  "step": $step,
  "status": "$status",
  "timestamp": "$(date -Iseconds)",
  "config": { $config_json }
}
EOF
        print_debug "Progress saved to $PROGRESS_FILE"
    fi
}

load_progress() {
    if [[ -f "$PROGRESS_FILE" ]] && command -v jq &> /dev/null; then
        print_info "Found saved progress at $PROGRESS_FILE"

        local step
        local timestamp
        step=$(jq -r '.step' "$PROGRESS_FILE")
        timestamp=$(jq -r '.timestamp' "$PROGRESS_FILE")

        print_debug "Saved at step $step on $timestamp"

        if confirm "Resume from step $step?"; then
            # Load config values
            while IFS="=" read -r key value; do
                CONFIG[$key]="$value"
            done < <(jq -r '.config | to_entries | .[] | "\(.key)=\(.value)"' "$PROGRESS_FILE")
            return "$step"
        fi
    fi
    return 0
}

clear_progress() {
    if [[ -f "$PROGRESS_FILE" ]]; then
        rm -f "$PROGRESS_FILE"
        print_debug "Progress file cleared"
    fi
}

# =============================================================================
# Cleanup Handler
# =============================================================================

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]] && [[ "$DRY_RUN" == "false" ]]; then
        echo ""
        print_warning "Setup interrupted!"
        if [[ ${CURRENT_STEP:-0} -gt 0 ]]; then
            save_progress "${CURRENT_STEP:-1}" "interrupted"
            print_info "Progress saved. Run with --resume to continue."
        fi
    fi
    exit $exit_code
}

trap cleanup SIGINT SIGTERM EXIT

# =============================================================================
# Configuration Steps
# =============================================================================

configure_supabase() {
    print_step 1 4 "Supabase Configuration"

    echo -e "  Supabase provides the database and authentication."
    echo ""
    echo -e "    ${CYAN}URL:${NC} $SUPABASE_DASHBOARD"
    echo ""
    echo -e "  Navigate to your project → ${BOLD}Settings → API${NC} to find these values:"
    echo ""

    # Project URL
    print_substep "Project URL (found in API settings or Connect button)"
    while true; do
        read_input "SUPABASE_URL" "" "SUPABASE_URL"
        if validate_url "${CONFIG[SUPABASE_URL]}"; then
            break
        fi
        print_error "Invalid URL. Must start with https://"
    done
    echo ""

    # Publishable Key (formerly Anon Key)
    print_substep "Publishable Key (safe to expose in frontend)"
    echo -e "    ${GRAY}Copy from: API Keys → Publishable key (sb_publishable_*)${NC}"
    echo -e "    ${GRAY}Or legacy 'anon' key from: Legacy anon, service_role API keys tab${NC}"
    while true; do
        read_secret "SUPABASE_ANON_KEY" "SUPABASE_ANON_KEY"
        if validate_supabase_key "${CONFIG[SUPABASE_ANON_KEY]}"; then
            break
        fi
        print_error "Invalid key format. Should start with 'sb_publishable_' or 'eyJ'"
    done
    echo ""

    # Secret Key (formerly Service Role Key)
    print_substep "Secret Key (${RED}KEEP SECRET${NC} - backend only)"
    echo -e "    ${YELLOW}⚠ This key bypasses RLS - never expose in frontend!${NC}"
    echo -e "    ${GRAY}Copy from: API Keys → Secret key (sb_secret_*)${NC}"
    echo -e "    ${GRAY}Or legacy 'service_role' key from: Legacy anon, service_role API keys tab${NC}"
    while true; do
        read_secret "SUPABASE_SERVICE_KEY" "SUPABASE_SERVICE_KEY"
        if validate_supabase_key "${CONFIG[SUPABASE_SERVICE_KEY]}"; then
            break
        fi
        print_error "Invalid key format. Should start with 'sb_secret_' or 'eyJ'"
    done
    echo ""

    # Database URL
    print_substep "Database Connection String"
    echo -e "    ${GRAY}Click 'Connect' button at top of dashboard${NC}"
    echo -e "    ${GRAY}Select your framework → Copy the connection string${NC}"
    echo -e "    ${GRAY}Format: postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres${NC}"
    while true; do
        read_secret "DATABASE_URL" "DATABASE_URL"
        if validate_database_url "${CONFIG[DATABASE_URL]}"; then
            break
        fi
        print_error "Invalid format. Must start with postgres:// or postgresql://"
    done
    echo ""

    print_success "Supabase configuration complete"
}

configure_sentry() {
    print_substep "Sentry Error Tracking (optional)"
    echo -e "    ${GRAY}Get DSN from: Sentry → Project → Settings → Client Keys (DSN)${NC}"

    if confirm "    Configure Sentry?"; then
        while true; do
            read_input "SENTRY_DSN" "" "SENTRY_DSN"
            if [[ -z "${CONFIG[SENTRY_DSN]}" ]] || validate_sentry_dsn "${CONFIG[SENTRY_DSN]}"; then
                break
            fi
            print_warning "DSN format looks unusual. Expected: https://key@org.ingest.sentry.io/project"
            if confirm "    Use this value anyway?"; then
                break
            fi
        done
    else
        CONFIG[SENTRY_DSN]=""
    fi
}

configure_redis() {
    print_substep "Redis URL"
    echo -e "    ${GRAY}From Upstash, Railway Redis, or other provider${NC}"
    while true; do
        read_secret "REDIS_URL" "REDIS_URL"
        if validate_redis_url "${CONFIG[REDIS_URL]}"; then
            break
        fi
        print_error "Invalid format. Must start with redis:// or rediss://"
    done
}

configure_vercel_vars() {
    print_step 2 4 "Vercel Environment Variables"

    echo -e "  These variables will be set in your Vercel project."
    echo ""

    # Check existing variables
    print_info "Checking existing Vercel environment variables..."

    local vercel_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_SENTRY_DSN")

    for var in "${vercel_vars[@]}"; do
        if check_vercel_env_exists "$var"; then
            print_success "$var already configured"
            if [[ "$FORCE_OVERWRITE" == "false" ]]; then
                if ! confirm "    Overwrite $var?"; then
                    continue
                fi
            fi
        fi

        case "$var" in
            "NEXT_PUBLIC_SUPABASE_URL")
                CONFIG[$var]="${CONFIG[SUPABASE_URL]}"
                print_debug "Using SUPABASE_URL value"
                ;;
            "NEXT_PUBLIC_SUPABASE_ANON_KEY")
                CONFIG[$var]="${CONFIG[SUPABASE_ANON_KEY]}"
                print_debug "Using SUPABASE_ANON_KEY value"
                ;;
            "NEXT_PUBLIC_API_URL")
                print_substep "Backend API URL"
                echo -e "    ${GRAY}Your Railway deployment URL (e.g., https://xxx.railway.app/api)${NC}"
                read_input "NEXT_PUBLIC_API_URL" "" "$var"
                ;;
            "NEXT_PUBLIC_SENTRY_DSN")
                if [[ -n "${CONFIG[SENTRY_DSN]:-}" ]]; then
                    CONFIG[$var]="${CONFIG[SENTRY_DSN]}"
                    print_debug "Using SENTRY_DSN value"
                else
                    CONFIG[$var]=""
                fi
                ;;
        esac
    done

    echo ""
    print_success "Vercel variables configured"
}

configure_railway_vars() {
    print_step 3 4 "Railway Environment Variables"

    echo -e "  These variables will be set in your Railway project."
    echo ""

    # Check existing variables
    print_info "Checking existing Railway environment variables..."

    # Auto-set values
    CONFIG[NODE_ENV]="production"
    CONFIG[PORT]="4000"
    print_debug "NODE_ENV=production (auto)"
    print_debug "PORT=4000 (auto)"

    # Copy from Supabase config
    print_debug "Using previously entered Supabase values"

    # Frontend URL
    print_substep "Frontend URL"
    echo -e "    ${GRAY}Your Vercel deployment URL (e.g., https://xxx.vercel.app)${NC}"
    while true; do
        read_input "FRONTEND_URL" "" "FRONTEND_URL"
        if validate_url "${CONFIG[FRONTEND_URL]}"; then
            break
        fi
        print_error "Invalid URL. Must start with https://"
    done
    echo ""

    # Redis
    configure_redis
    echo ""

    # Sentry (if not already configured)
    if [[ -z "${CONFIG[SENTRY_DSN]:-}" ]]; then
        configure_sentry
    fi

    echo ""
    print_success "Railway variables configured"
}

configure_github_secrets() {
    print_step 4 4 "GitHub Secrets (CI/CD)"

    echo -e "  These secrets enable automated deployments via GitHub Actions."
    echo ""

    # Check if gh is available
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI (gh) not installed"
        echo -e "    ${GRAY}Install from: https://cli.github.com/${NC}"
        echo ""
        echo -e "  ${YELLOW}Manual configuration required:${NC}"
        echo -e "    Go to: Repository → Settings → Secrets and variables → Actions"
        echo ""
        return
    fi

    if ! check_gh_cli; then
        print_warning "GitHub CLI not authenticated"
        if confirm "    Run 'gh auth login' now?"; then
            gh auth login
        else
            echo ""
            echo -e "  ${YELLOW}Manual configuration required:${NC}"
            echo -e "    Go to: Repository → Settings → Secrets and variables → Actions"
            return
        fi
    fi

    print_info "Checking existing GitHub secrets..."

    # Vercel Token
    print_substep "Vercel Token"
    echo -e "    ${GRAY}Get from: $VERCEL_TOKENS${NC}"
    if check_github_secret_exists "VERCEL_TOKEN"; then
        print_success "VERCEL_TOKEN already exists"
        if [[ "$FORCE_OVERWRITE" == "false" ]] && ! confirm "    Overwrite?"; then
            :
        else
            read_secret "VERCEL_TOKEN" "VERCEL_TOKEN"
        fi
    else
        read_secret "VERCEL_TOKEN" "VERCEL_TOKEN"
    fi
    echo ""

    # Railway Token
    print_substep "Railway Token"
    echo -e "    ${GRAY}Get from: $RAILWAY_TOKENS${NC}"
    if check_github_secret_exists "RAILWAY_TOKEN"; then
        print_success "RAILWAY_TOKEN already exists"
        if [[ "$FORCE_OVERWRITE" == "false" ]] && ! confirm "    Overwrite?"; then
            :
        else
            read_secret "RAILWAY_TOKEN" "RAILWAY_TOKEN"
        fi
    else
        read_secret "RAILWAY_TOKEN" "RAILWAY_TOKEN"
    fi
    echo ""

    # Sentry Auth Token (optional)
    print_substep "Sentry Auth Token (optional)"
    echo -e "    ${GRAY}Get from: $SENTRY_TOKENS → Organization Tokens${NC}"
    if confirm "    Configure Sentry CI integration?"; then
        read_secret "SENTRY_AUTH_TOKEN" "SENTRY_AUTH_TOKEN"
        read_input "SENTRY_ORG (organization slug)" "" "SENTRY_ORG"
    fi
    echo ""

    print_success "GitHub secrets configured"
}

# =============================================================================
# Execution Functions
# =============================================================================

execute_vercel_config() {
    print_header "Configuring Vercel Environment"

    local vercel_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_SENTRY_DSN")

    for var in "${vercel_vars[@]}"; do
        local value="${CONFIG[$var]:-}"
        if [[ -z "$value" ]]; then
            print_debug "Skipping $var (not set)"
            continue
        fi

        print_info "Setting $var..."
        if [[ "$DRY_RUN" == "true" ]]; then
            print_debug "[DRY-RUN] Would run: echo \"\$value\" | vercel env add $var production --force"
        else
            if echo "$value" | vercel env add "$var" production --force 2>/dev/null; then
                print_success "$var configured"
            else
                print_error "Failed to set $var"
            fi
        fi
    done
}

execute_railway_config() {
    print_header "Configuring Railway Environment"

    local railway_vars=(
        "NODE_ENV"
        "PORT"
        "DATABASE_URL"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_KEY"
        "REDIS_URL"
        "FRONTEND_URL"
        "SENTRY_DSN"
    )

    local cmd="railway variables set"
    local has_vars=false

    for var in "${railway_vars[@]}"; do
        local value="${CONFIG[$var]:-}"
        if [[ -n "$value" ]]; then
            cmd="$cmd $var=\"$value\""
            has_vars=true
        fi
    done

    if [[ "$has_vars" == "false" ]]; then
        print_warning "No Railway variables to set"
        return
    fi

    print_info "Setting Railway variables..."
    if [[ "$DRY_RUN" == "true" ]]; then
        print_debug "[DRY-RUN] Would run: railway variables set NODE_ENV=production PORT=4000 ..."
    else
        if eval "$cmd" 2>/dev/null; then
            print_success "Railway variables configured"
        else
            print_error "Failed to set Railway variables"
        fi
    fi
}

execute_github_config() {
    print_header "Configuring GitHub Secrets"

    if ! command -v gh &> /dev/null; then
        print_warning "Skipping GitHub secrets (gh CLI not available)"
        return
    fi

    local github_secrets=("VERCEL_TOKEN" "RAILWAY_TOKEN" "SENTRY_AUTH_TOKEN" "SENTRY_ORG")

    for secret in "${github_secrets[@]}"; do
        local value="${CONFIG[$secret]:-}"
        if [[ -z "$value" ]]; then
            print_debug "Skipping $secret (not set)"
            continue
        fi

        print_info "Setting $secret..."
        if [[ "$DRY_RUN" == "true" ]]; then
            print_debug "[DRY-RUN] Would run: echo \"\$value\" | gh secret set $secret"
        else
            if echo "$value" | gh secret set "$secret" 2>/dev/null; then
                print_success "$secret configured"
            else
                print_error "Failed to set $secret"
            fi
        fi
    done
}

# =============================================================================
# Summary Functions
# =============================================================================

show_summary() {
    print_header "Configuration Summary"

    echo -e "  ${BOLD}Vercel (Frontend):${NC}"
    echo -e "    NEXT_PUBLIC_SUPABASE_URL: ${CONFIG[NEXT_PUBLIC_SUPABASE_URL]:-${GRAY}<not set>${NC}}"
    echo -e "    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${CONFIG[NEXT_PUBLIC_SUPABASE_ANON_KEY]:+${GREEN}[set]${NC}}${CONFIG[NEXT_PUBLIC_SUPABASE_ANON_KEY]:-${GRAY}<not set>${NC}}"
    echo -e "    NEXT_PUBLIC_API_URL: ${CONFIG[NEXT_PUBLIC_API_URL]:-${GRAY}<not set>${NC}}"
    echo -e "    NEXT_PUBLIC_SENTRY_DSN: ${CONFIG[NEXT_PUBLIC_SENTRY_DSN]:-${GRAY}<not set>${NC}}"
    echo ""

    echo -e "  ${BOLD}Railway (Backend):${NC}"
    echo -e "    NODE_ENV: ${CONFIG[NODE_ENV]:-${GRAY}<not set>${NC}}"
    echo -e "    PORT: ${CONFIG[PORT]:-${GRAY}<not set>${NC}}"
    echo -e "    DATABASE_URL: ${CONFIG[DATABASE_URL]:+${GREEN}[set]${NC}}${CONFIG[DATABASE_URL]:-${GRAY}<not set>${NC}}"
    echo -e "    SUPABASE_URL: ${CONFIG[SUPABASE_URL]:-${GRAY}<not set>${NC}}"
    echo -e "    SUPABASE_ANON_KEY: ${CONFIG[SUPABASE_ANON_KEY]:+${GREEN}[set]${NC}}${CONFIG[SUPABASE_ANON_KEY]:-${GRAY}<not set>${NC}}"
    echo -e "    SUPABASE_SERVICE_KEY: ${CONFIG[SUPABASE_SERVICE_KEY]:+${GREEN}[set]${NC}}${CONFIG[SUPABASE_SERVICE_KEY]:-${GRAY}<not set>${NC}}"
    echo -e "    REDIS_URL: ${CONFIG[REDIS_URL]:+${GREEN}[set]${NC}}${CONFIG[REDIS_URL]:-${GRAY}<not set>${NC}}"
    echo -e "    FRONTEND_URL: ${CONFIG[FRONTEND_URL]:-${GRAY}<not set>${NC}}"
    echo -e "    SENTRY_DSN: ${CONFIG[SENTRY_DSN]:-${GRAY}<not set>${NC}}"
    echo ""

    echo -e "  ${BOLD}GitHub Secrets (CI/CD):${NC}"
    echo -e "    VERCEL_TOKEN: ${CONFIG[VERCEL_TOKEN]:+${GREEN}[set]${NC}}${CONFIG[VERCEL_TOKEN]:-${GRAY}<not set>${NC}}"
    echo -e "    RAILWAY_TOKEN: ${CONFIG[RAILWAY_TOKEN]:+${GREEN}[set]${NC}}${CONFIG[RAILWAY_TOKEN]:-${GRAY}<not set>${NC}}"
    echo -e "    SENTRY_AUTH_TOKEN: ${CONFIG[SENTRY_AUTH_TOKEN]:+${GREEN}[set]${NC}}${CONFIG[SENTRY_AUTH_TOKEN]:-${GRAY}<not set>${NC}}"
    echo -e "    SENTRY_ORG: ${CONFIG[SENTRY_ORG]:-${GRAY}<not set>${NC}}"
    echo ""

    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY-RUN MODE - No changes will be made"
        echo ""
    fi
}

check_status() {
    print_header "Current Configuration Status"

    echo -e "  ${BOLD}Vercel Environment:${NC}"
    if command -v vercel &> /dev/null && check_vercel_login 2>/dev/null; then
        local vercel_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_SENTRY_DSN")
        for var in "${vercel_vars[@]}"; do
            if check_vercel_env_exists "$var"; then
                echo -e "    ${GREEN}✓${NC} $var"
            else
                echo -e "    ${RED}✗${NC} $var"
            fi
        done
    else
        echo -e "    ${YELLOW}⚠${NC} Cannot check (not logged in or CLI not installed)"
    fi
    echo ""

    echo -e "  ${BOLD}Railway Environment:${NC}"
    if command -v railway &> /dev/null && check_railway_login 2>/dev/null; then
        local railway_vars=("NODE_ENV" "PORT" "DATABASE_URL" "SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_KEY" "REDIS_URL" "FRONTEND_URL" "SENTRY_DSN")
        for var in "${railway_vars[@]}"; do
            if check_railway_var_exists "$var"; then
                echo -e "    ${GREEN}✓${NC} $var"
            else
                echo -e "    ${RED}✗${NC} $var"
            fi
        done
    else
        echo -e "    ${YELLOW}⚠${NC} Cannot check (not logged in or CLI not installed)"
    fi
    echo ""

    echo -e "  ${BOLD}GitHub Secrets:${NC}"
    if command -v gh &> /dev/null && check_gh_cli 2>/dev/null; then
        local github_secrets=("VERCEL_TOKEN" "RAILWAY_TOKEN" "SENTRY_AUTH_TOKEN" "SENTRY_ORG")
        for secret in "${github_secrets[@]}"; do
            if check_github_secret_exists "$secret"; then
                echo -e "    ${GREEN}✓${NC} $secret"
            else
                echo -e "    ${RED}✗${NC} $secret"
            fi
        done
    else
        echo -e "    ${YELLOW}⚠${NC} Cannot check (not logged in or CLI not installed)"
    fi
    echo ""
}

# =============================================================================
# Help & Usage
# =============================================================================

show_help() {
    cat << EOF
${BOLD}Life Assistant - Production Setup${NC}

Configure environment variables for Vercel, Railway, and GitHub Actions.

${BOLD}USAGE${NC}
    pnpm setup:prod [OPTIONS]

${BOLD}OPTIONS${NC}
    ${GREEN}--help, -h${NC}         Show this help message
    ${GREEN}--dry-run${NC}          Preview configuration without making changes
    ${GREEN}--check${NC}            Check current configuration status
    ${GREEN}--resume${NC}           Resume interrupted setup
    ${GREEN}--force${NC}            Overwrite existing variables without asking
    ${GREEN}--vercel-only${NC}      Configure only Vercel environment
    ${GREEN}--railway-only${NC}     Configure only Railway environment
    ${GREEN}--github-only${NC}      Configure only GitHub secrets

${BOLD}PREREQUISITES${NC}
    The following CLIs should be installed and authenticated:
      • vercel (npm install -g vercel && vercel login)
      • railway (npm install -g @railway/cli && railway login)
      • gh (optional, for GitHub secrets)

${BOLD}WHAT IT CONFIGURES${NC}
    ${CYAN}Vercel (4 variables):${NC}
      NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SENTRY_DSN

    ${CYAN}Railway (9 variables):${NC}
      NODE_ENV, PORT, DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY, REDIS_URL, FRONTEND_URL, SENTRY_DSN

    ${CYAN}GitHub Secrets (4 secrets):${NC}
      VERCEL_TOKEN, RAILWAY_TOKEN, SENTRY_AUTH_TOKEN, SENTRY_ORG

${BOLD}EXAMPLES${NC}
    ${GRAY}# Full interactive setup${NC}
    pnpm setup:prod

    ${GRAY}# Preview what would be configured${NC}
    pnpm setup:prod --dry-run

    ${GRAY}# Check current status${NC}
    pnpm setup:prod --check

    ${GRAY}# Configure only Vercel${NC}
    pnpm setup:prod --vercel-only

${BOLD}SEE ALSO${NC}
    DEPLOYMENT.md - Detailed deployment guide with credential locations

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
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --check)
                CHECK_ONLY=true
                shift
                ;;
            --resume)
                RESUME_MODE=true
                shift
                ;;
            --force)
                FORCE_OVERWRITE=true
                shift
                ;;
            --vercel-only)
                VERCEL_ONLY=true
                shift
                ;;
            --railway-only)
                RAILWAY_ONLY=true
                shift
                ;;
            --github-only)
                GITHUB_ONLY=true
                shift
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

preflight_checks() {
    print_info "Running pre-flight checks..."

    local has_errors=false

    # Check Vercel CLI
    if [[ "$RAILWAY_ONLY" == "false" ]] && [[ "$GITHUB_ONLY" == "false" ]]; then
        if ! check_cli_installed "vercel" "npm install -g vercel"; then
            has_errors=true
        elif ! check_vercel_login; then
            print_warning "Not logged in to Vercel"
            if confirm "Run 'vercel login' now?"; then
                vercel login
            else
                has_errors=true
            fi
        fi
    fi

    # Check Railway CLI
    if [[ "$VERCEL_ONLY" == "false" ]] && [[ "$GITHUB_ONLY" == "false" ]]; then
        if ! check_cli_installed "railway" "npm install -g @railway/cli"; then
            has_errors=true
        elif ! check_railway_login; then
            print_warning "Not logged in to Railway"
            if confirm "Run 'railway login' now?"; then
                railway login
            else
                has_errors=true
            fi
        fi
    fi

    # Check GitHub CLI (optional)
    if [[ "$VERCEL_ONLY" == "false" ]] && [[ "$RAILWAY_ONLY" == "false" ]]; then
        if ! command -v gh &> /dev/null; then
            print_warning "GitHub CLI (gh) not installed - GitHub secrets will need manual configuration"
        elif ! check_gh_cli; then
            print_warning "GitHub CLI not authenticated"
            if confirm "Run 'gh auth login' now?"; then
                gh auth login
            fi
        fi
    fi

    if [[ "$has_errors" == "true" ]]; then
        print_error "Pre-flight checks failed. Please resolve the issues above."
        exit 1
    fi

    echo ""
    print_success "Pre-flight checks passed"
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_args "$@"

    print_header "Life Assistant - Production Setup"

    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY-RUN MODE - No changes will be made"
        echo ""
    fi

    # Check-only mode
    if [[ "$CHECK_ONLY" == "true" ]]; then
        check_status
        exit 0
    fi

    # Pre-flight checks
    preflight_checks

    # Resume mode
    local start_step=1
    if [[ "$RESUME_MODE" == "true" ]]; then
        load_progress || start_step=$?
    fi

    CURRENT_STEP=0

    # Step 1: Supabase Configuration
    if [[ "$VERCEL_ONLY" == "false" ]] && [[ "$GITHUB_ONLY" == "false" ]] && [[ $start_step -le 1 ]]; then
        CURRENT_STEP=1
        configure_supabase
    fi

    # Step 2: Vercel Variables
    if [[ "$RAILWAY_ONLY" == "false" ]] && [[ "$GITHUB_ONLY" == "false" ]] && [[ $start_step -le 2 ]]; then
        CURRENT_STEP=2
        configure_vercel_vars
    fi

    # Step 3: Railway Variables
    if [[ "$VERCEL_ONLY" == "false" ]] && [[ "$GITHUB_ONLY" == "false" ]] && [[ $start_step -le 3 ]]; then
        CURRENT_STEP=3
        configure_railway_vars
    fi

    # Step 4: GitHub Secrets
    if [[ "$VERCEL_ONLY" == "false" ]] && [[ "$RAILWAY_ONLY" == "false" ]] && [[ $start_step -le 4 ]]; then
        CURRENT_STEP=4
        configure_github_secrets
    fi

    # Show summary
    show_summary

    # Confirm execution
    if ! confirm "Proceed with configuration?"; then
        print_warning "Configuration cancelled"
        exit 0
    fi

    # Execute configuration
    if [[ "$RAILWAY_ONLY" == "false" ]] && [[ "$GITHUB_ONLY" == "false" ]]; then
        execute_vercel_config
    fi

    if [[ "$VERCEL_ONLY" == "false" ]] && [[ "$GITHUB_ONLY" == "false" ]]; then
        execute_railway_config
    fi

    if [[ "$VERCEL_ONLY" == "false" ]] && [[ "$RAILWAY_ONLY" == "false" ]]; then
        execute_github_config
    fi

    # Clear progress on successful completion
    clear_progress

    print_header "Setup Complete!"

    echo -e "  ${GREEN}Next steps:${NC}"
    echo -e "    1. Deploy frontend: ${CYAN}vercel --prod${NC} or push to main"
    echo -e "    2. Deploy backend: ${CYAN}railway up${NC} or push to main"
    echo -e "    3. Verify: Check Sentry for any errors"
    echo ""
    echo -e "  ${GRAY}See DEPLOYMENT.md for troubleshooting${NC}"
    echo ""
}

# Run main function
main "$@"
