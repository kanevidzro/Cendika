#!/bin/bash

# AfriCom API Setup Script
# This script sets up the entire development environment

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup
main() {
    print_header "🌍 AfriCom API - Setup"
    echo ""

    # Check Bun installation
    print_info "Checking Bun installation..."
    if ! command_exists bun; then
        print_error "Bun is not installed"
        print_info "Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        print_success "Bun installed"
    else
        print_success "Bun is installed ($(bun --version))"
    fi

    # Check Docker installation
    print_info "Checking Docker installation..."
    if ! command_exists docker; then
        print_warning "Docker is not installed"
        print_info "Please install Docker from https://docker.com"
    else
        print_success "Docker is installed ($(docker --version | cut -d' ' -f3 | cut -d',' -f1))"
    fi

    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose is available"
    else
        print_warning "Docker Compose is not available"
    fi

    echo ""
    print_header "📦 Installing Dependencies"
    bun install
    print_success "Dependencies installed"

    echo ""
    print_header "🔧 Setting up Environment"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating .env file from .env.example..."
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please update .env with your actual configuration"
    else
        print_success ".env file already exists"
    fi

    echo ""
    print_header "🐳 Starting Docker Services"
    
    if command_exists docker; then
        print_info "Starting PostgreSQL and Redis..."
        docker-compose up -d
        
        # Wait for services to be ready
        print_info "Waiting for services to be ready..."
        sleep 5
        
        # Check if PostgreSQL is ready
        if docker-compose ps | grep -q "postgres.*Up"; then
            print_success "PostgreSQL is running"
        else
            print_warning "PostgreSQL may not be running properly"
        fi
        
        # Check if Redis is ready
        if docker-compose ps | grep -q "redis.*Up"; then
            print_success "Redis is running"
        else
            print_warning "Redis may not be running properly"
        fi
    else
        print_warning "Docker not available, skipping service startup"
        print_info "You'll need to set up PostgreSQL and Redis manually"
    fi

    echo ""
    print_header "🗄️  Setting up Database"
    
    # Generate Prisma client
    print_info "Generating Prisma client..."
    bun run db:generate
    print_success "Prisma client generated"
    
    # Push database schema
    print_info "Pushing database schema..."
    if bun run db:push; then
        print_success "Database schema pushed"
    else
        print_error "Failed to push database schema"
        print_info "Make sure PostgreSQL is running and DATABASE_URL is correct in .env"
    fi

    echo ""
    print_header "📊 Seeding Database"
    
    print_info "Seeding African countries and networks..."
    if bun run db:seed:africa 2>/dev/null; then
        print_success "Database seeded with African data"
    else
        print_warning "Failed to seed database (this is okay if seed files don't exist yet)"
    fi

    echo ""
    print_header "✅ Setup Complete!"
    echo ""
    print_success "Your AfriCom API is ready!"
    echo ""
    print_info "Next steps:"
    echo "  1. Update your .env file with actual credentials"
    echo "  2. Review the configuration in src/core/config/"
    echo "  3. Start the development server: ${GREEN}make dev${NC} or ${GREEN}bun run dev${NC}"
    echo ""
    print_info "Useful commands:"
    echo "  ${GREEN}make dev${NC}         - Start development server"
    echo "  ${GREEN}make docker-up${NC}   - Start Docker services"
    echo "  ${GREEN}make docker-down${NC} - Stop Docker services"
    echo "  ${GREEN}make db-studio${NC}   - Open Prisma Studio"
    echo "  ${GREEN}make help${NC}        - Show all available commands"
    echo ""
    print_info "Documentation:"
    echo "  API Docs:  http://localhost:3000/docs"
    echo "  Health:    http://localhost:3000/health"
    echo "  Status:    http://localhost:3000/status"
    echo ""
    print_header "🌍 Built for Africa 🚀"
}

# Run main function
main