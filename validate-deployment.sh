#!/bin/bash
# Deployment Validation Script (Bash version for Linux/Mac)
# Validates that deployment rules are not violated before deploying

set -e

STRICT_MODE=false
VALIDATION_ERRORS=()
VALIDATION_WARNINGS=()
PASSED_CHECKS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strict)
            STRICT_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "========================================"
echo "  DEPLOYMENT VALIDATION CHECK"
echo "========================================"
echo ""

# Function to check if a file contains a specific port
test_port_in_file() {
    local file_path="$1"
    local expected_port="$2"
    local forbidden_ports="$3"
    local description="$4"
    
    if [ ! -f "$file_path" ]; then
        VALIDATION_ERRORS+=("❌ File not found: $file_path")
        return 1
    fi
    
    local content=$(cat "$file_path")
    
    # Check if expected port is present
    if [ -n "$expected_port" ] && ! echo "$content" | grep -q ":$expected_port[^0-9]"; then
        VALIDATION_ERRORS+=("❌ CRITICAL: $description - Expected port $expected_port not found in $file_path")
        return 1
    fi
    
    # Check for forbidden ports
    for port in $forbidden_ports; do
        if echo "$content" | grep -q ":$port[^0-9]"; then
            VALIDATION_ERRORS+=("❌ CRITICAL: $description - Forbidden port $port found in $file_path")
            return 1
        fi
    done
    
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "✅ $description"
    return 0
}

# Function to check if file has been modified (using git)
test_file_modified() {
    local file_path="$1"
    local description="$2"
    
    if [ ! -f "$file_path" ]; then
        return 1
    fi
    
    if command -v git &> /dev/null; then
        local git_status=$(git status --porcelain "$file_path" 2>&1 || true)
        if echo "$git_status" | grep -qE "^[AM]"; then
            VALIDATION_WARNINGS+=("⚠️  WARNING: $description - File has been modified: $file_path")
            if [ "$STRICT_MODE" = true ]; then
                VALIDATION_ERRORS+=("❌ STRICT MODE: $description - File modification not allowed: $file_path")
            fi
            return 0
        fi
    fi
    
    return 1
}

echo "Checking Port Configurations..."
echo ""

# Check 1: API Service File - Port 8080
test_port_in_file \
    "backend/Milo.API/Services/milo-backend.service" \
    "8080" \
    "4000 5000 5001 8000" \
    "API Service Port (must be 8080)"

# Check 2: Docker Compose - PostgreSQL Port 5432
test_port_in_file \
    "docker-compose.yml" \
    "5432" \
    "" \
    "PostgreSQL Port (must be 5432)"

# Check 3: Docker Compose - PgBouncer Port 6432
test_port_in_file \
    "docker-compose.yml" \
    "6432" \
    "" \
    "PgBouncer Port (must be 6432)"

# Check 4: Connection String - PgBouncer Port 6432
if [ -f "backend/Milo.API/appsettings.json" ]; then
    if grep -q "Port=6432" "backend/Milo.API/appsettings.json"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        echo "✅ Connection String uses PgBouncer port 6432"
    else
        VALIDATION_ERRORS+=("❌ CRITICAL: Connection string must use port 6432 (PgBouncer)")
    fi
    
    # Check for forbidden ports in connection string
    if grep -qE "Port=(4000|5000|5001|8000|5432)[^0-9]" "backend/Milo.API/appsettings.json"; then
        VALIDATION_ERRORS+=("❌ CRITICAL: Connection string should use PgBouncer port 6432, not direct PostgreSQL port")
    fi
else
    VALIDATION_ERRORS+=("❌ appsettings.json not found")
fi

echo ""
echo "Checking for Infrastructure Changes..."
echo ""

# Check 5: Service file modifications
test_file_modified \
    "backend/Milo.API/Services/milo-backend.service" \
    "Service File"

# Check 6: Docker compose modifications
test_file_modified \
    "docker-compose.yml" \
    "Docker Compose"

# Check 7: appsettings.json modifications (warn only)
if test_file_modified "backend/Milo.API/appsettings.json" "appsettings.json"; then
    echo "⚠️  appsettings.json has been modified (this may be intentional)"
fi

echo ""
echo "Checking for Nginx Config References..."
echo ""

# Check 8: Look for any scripts that modify nginx configs
if find . -name "*.json" -type f 2>/dev/null | xargs grep -l "nginx\|milo-api\.conf\|00-summit-api\.conf" 2>/dev/null | xargs grep -l "sed\|tee\|cat.*nginx" 2>/dev/null | grep -q .; then
    for script in $(find . -name "*.json" -type f 2>/dev/null | xargs grep -l "nginx\|milo-api\.conf\|00-summit-api\.conf" 2>/dev/null | xargs grep -l "sed\|tee\|cat.*nginx" 2>/dev/null); do
        VALIDATION_WARNINGS+=("⚠️  WARNING: Script may modify nginx config: $script")
        if [ "$STRICT_MODE" = true ]; then
            VALIDATION_ERRORS+=("❌ STRICT MODE: Nginx config modification detected in: $script")
        fi
    done
else
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "✅ No nginx modification scripts detected"
fi

echo ""
echo "Summary of Changes..."
echo ""

# Check what files are staged/modified
if command -v git &> /dev/null; then
    MODIFIED_FILES=$(git diff --name-only HEAD 2>/dev/null || true)
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)
    ALL_CHANGED_FILES=$(echo -e "$MODIFIED_FILES\n$STAGED_FILES" | grep -v '^$' | sort -u)
    
    INFRASTRUCTURE_FILES=(
        "backend/Milo.API/Services/milo-backend.service"
        "docker-compose.yml"
        "backend/Milo.API/appsettings.json"
        "backend/Milo.API/publish/appsettings.json"
    )
    
    CHANGED_INFRA_FILES=""
    for file in $ALL_CHANGED_FILES; do
        for infra_file in "${INFRASTRUCTURE_FILES[@]}"; do
            if echo "$file" | grep -q "$infra_file"; then
                CHANGED_INFRA_FILES="$CHANGED_INFRA_FILES $file"
                break
            fi
        done
    done
    
    if [ -n "$CHANGED_INFRA_FILES" ]; then
        echo "⚠️  Infrastructure files have been modified:"
        for file in $CHANGED_INFRA_FILES; do
            echo "   - $file"
            VALIDATION_WARNINGS+=("⚠️  Infrastructure file modified: $file")
            if [ "$STRICT_MODE" = true ]; then
                VALIDATION_ERRORS+=("❌ STRICT MODE: Infrastructure file modification: $file")
            fi
        done
    else
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        echo "✅ No infrastructure files modified"
    fi
    
    # Show code-only changes
    CODE_FILES=$(echo "$ALL_CHANGED_FILES" | grep -E "(Controllers|Services/.*\.cs|Models|Data/)" | grep -v "appsettings.json" | grep -v "milo-backend.service" || true)
    
    if [ -n "$CODE_FILES" ]; then
        echo ""
        echo "✅ Code files changed (this is expected):"
        echo "$CODE_FILES" | while read -r file; do
            echo "   + $file"
        done
    fi
else
    echo "⚠️  Git not available, skipping file change detection"
fi

echo ""
echo "========================================"
echo "  VALIDATION RESULTS"
echo "========================================"
echo ""

echo "✅ Passed Checks: $PASSED_CHECKS"

if [ ${#VALIDATION_WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Warnings: ${#VALIDATION_WARNINGS[@]}"
    for warning in "${VALIDATION_WARNINGS[@]}"; do
        echo "   $warning"
    done
fi

if [ ${#VALIDATION_ERRORS[@]} -gt 0 ]; then
    echo ""
    echo "❌ ERRORS: ${#VALIDATION_ERRORS[@]}"
    for error in "${VALIDATION_ERRORS[@]}"; do
        echo "   $error"
    done
    echo ""
    echo "🚫 DEPLOYMENT BLOCKED - Please fix the errors above"
    echo "   See DEPLOYMENT_RULES.md for guidelines"
    exit 1
fi

if [ ${#VALIDATION_WARNINGS[@]} -gt 0 ] && [ "$STRICT_MODE" = true ]; then
    echo ""
    echo "🚫 DEPLOYMENT BLOCKED - Warnings found in strict mode"
    exit 1
fi

if [ ${#VALIDATION_WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Warnings found but deployment allowed (use --strict to block)"
    echo "   Review warnings above before proceeding"
fi

echo ""
echo "✅ VALIDATION PASSED - Deployment can proceed"
echo ""
exit 0
