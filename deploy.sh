#!/bin/bash
set -e

#####################################################################
# LMS Deployment Script
# Performs zero-downtime updates with health checks and rollback
#####################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE_CMD="docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE}"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2

# Function to print colored messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a service is healthy
check_health() {
    local service=$1
    local container_name=$2
    
    info "Checking health of $service..."
    
    for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
        if docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null | grep -q "healthy"; then
            info "$service is healthy"
            return 0
        fi
        
        if [ $i -lt $HEALTH_CHECK_RETRIES ]; then
            echo -n "."
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    error "$service failed health check after $((HEALTH_CHECK_RETRIES * HEALTH_CHECK_INTERVAL)) seconds"
    return 1
}

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    error "Environment file $ENV_FILE not found!"
    error "Copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

info "Starting LMS deployment..."
info "Domain: $BASE_DOMAIN"
info "Image tag: ${IMAGE_TAG:-latest}"

# Check if database volume exists
DB_VOLUME_EXISTS=$(docker volume ls -q -f name=lms_postgres-data 2>/dev/null || echo "")

if [ -z "$DB_VOLUME_EXISTS" ]; then
    info "First deployment detected - creating database..."
fi

# Pull latest images
info "Pulling latest Docker images..."
$COMPOSE_CMD pull

# Ensure database is running first
info "Starting infrastructure services..."
$COMPOSE_CMD up -d traefik postgres

# Wait for database to be ready
info "Waiting for database to be ready..."
sleep 10
for i in $(seq 1 30); do
    if $COMPOSE_CMD exec -T postgres pg_isready -U lms 2>/dev/null | grep -q "accepting connections"; then
        info "Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Database failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# Run database migrations using the NEWLY PULLED image in a one-off container.
# (Never `exec` into the running backend here — during an update that container
# is still the OLD image and only knows about the old migrations, so new
# migrations would be silently skipped.)
info "Running database migrations..."
$COMPOSE_CMD run --rm --no-deps backend npm run migrate:deploy || {
    error "Database migration failed!"
    exit 1
}

# Store current container IDs for rollback
OLD_BACKEND=$(docker ps -q -f name=lms-backend 2>/dev/null || echo "")
OLD_FRONTEND=$(docker ps -q -f name=lms-frontend 2>/dev/null || echo "")

info "Starting updated services..."

# Start backend first
$COMPOSE_CMD up -d backend

# Wait for backend to be healthy
if ! check_health "backend" "lms-backend"; then
    error "Backend deployment failed health check!"
    
    if [ -n "$OLD_BACKEND" ]; then
        warn "Rolling back backend..."
        docker start "$OLD_BACKEND" || true
    fi
    
    exit 1
fi

# Start frontend
$COMPOSE_CMD up -d frontend

# Wait for frontend to be healthy
if ! check_health "frontend" "lms-frontend"; then
    error "Frontend deployment failed health check!"
    
    if [ -n "$OLD_FRONTEND" ]; then
        warn "Rolling back frontend..."
        docker start "$OLD_FRONTEND" || true
    fi
    
    exit 1
fi

# Clean up old containers
info "Cleaning up old containers..."
docker system prune -f --filter "until=24h"

info "Deployment completed successfully! ✓"
info "Your LMS is running at https://$BASE_DOMAIN"
info ""

# Check if this is first deployment (no admin user exists)
info "Checking for admin user..."
ADMIN_COUNT=$($COMPOSE_CMD exec -T backend sh -c "
  node -e \"
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.count({ where: { role: 'admin', tenantId: null } })
      .then(count => { console.log(count); prisma.\\\$disconnect(); })
      .catch(() => { console.log('0'); prisma.\\\$disconnect(); });
  \"
" 2>/dev/null | tail -1 || echo "0")

if [ "$ADMIN_COUNT" = "0" ]; then
    warn "No global admin user found!"
    info ""
    info "==================================================="
    info "  FIRST-TIME SETUP REQUIRED"
    info "==================================================="
    info ""
    info "Run the setup wizard to create your admin account:"
    info "  docker compose -f $COMPOSE_FILE exec backend npm run setup"
    info ""
    info "Then access your LMS at: https://$BASE_DOMAIN"
    info "==================================================="
    info ""
else
    info "Admin user exists. Ready to use!"
fi

info "Useful commands:"
info "  View logs:     docker compose -f $COMPOSE_FILE logs -f"
info "  Stop services: docker compose -f $COMPOSE_FILE down"
info "  Restart:       docker compose -f $COMPOSE_FILE restart"
