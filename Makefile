.PHONY: help install dev start build clean test docker-up docker-down db-generate db-push db-migrate db-studio db-seed

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)AfriCom API - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	bun install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

dev: ## Run development server with hot reload
	@echo "$(BLUE)Starting development server...$(NC)"
	bun run dev

start: ## Run production server
	@echo "$(BLUE)Starting production server...$(NC)"
	bun run start

build: ## Build the application
	@echo "$(BLUE)Building application...$(NC)"
	bun run build
	@echo "$(GREEN)✓ Build complete$(NC)"

clean: ## Clean generated files and dependencies
	@echo "$(YELLOW)Cleaning...$(NC)"
	rm -rf node_modules dist generated logs
	@echo "$(GREEN)✓ Cleaned$(NC)"

# Database commands
db-generate: ## Generate Prisma client
	@echo "$(BLUE)Generating Prisma client...$(NC)"
	bun run db:generate
	@echo "$(GREEN)✓ Prisma client generated$(NC)"

db-push: ## Push schema changes to database (development)
	@echo "$(BLUE)Pushing schema to database...$(NC)"
	bun run db:push
	@echo "$(GREEN)✓ Schema pushed$(NC)"

db-migrate: ## Create and run migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	bun run db:migrate
	@echo "$(GREEN)✓ Migrations complete$(NC)"

db-migrate-deploy: ## Deploy migrations (production)
	@echo "$(BLUE)Deploying migrations...$(NC)"
	bun run db:migrate:deploy
	@echo "$(GREEN)✓ Migrations deployed$(NC)"

db-studio: ## Open Prisma Studio
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	bun run db:studio

db-seed: ## Seed database with initial data
	@echo "$(BLUE)Seeding database...$(NC)"
	bun run db:seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-seed-africa: ## Seed African countries and networks data
	@echo "$(BLUE)Seeding African data...$(NC)"
	bun run db:seed:africa
	@echo "$(GREEN)✓ African data seeded$(NC)"

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "$(RED)⚠️  Resetting database...$(NC)"
	bun run db:push --force-reset
	@echo "$(GREEN)✓ Database reset$(NC)"

# Docker commands
docker-up: ## Start Docker containers
	@echo "$(BLUE)Starting Docker containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Containers started$(NC)"

docker-down: ## Stop Docker containers
	@echo "$(YELLOW)Stopping Docker containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Containers stopped$(NC)"

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-ps: ## List running containers
	docker-compose ps

docker-restart: ## Restart Docker containers
	@echo "$(BLUE)Restarting containers...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Containers restarted$(NC)"

docker-clean: ## Stop and remove all containers, volumes, and networks
	@echo "$(RED)⚠️  Cleaning Docker...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)✓ Docker cleaned$(NC)"

# Testing commands
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	bun test

test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	bun run test:unit

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	bun run test:integration

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running e2e tests...$(NC)"
	bun run test:e2e

# Quality checks
lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	bun run lint

format: ## Format code
	@echo "$(BLUE)Formatting code...$(NC)"
	bun run format
	@echo "$(GREEN)✓ Code formatted$(NC)"

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Type checking...$(NC)"
	bun run type-check
	@echo "$(GREEN)✓ Type check passed$(NC)"

# Setup commands
setup: install docker-up db-generate db-push ## Complete setup (install, docker, database)
	@echo "$(GREEN)✓ Setup complete! Run 'make dev' to start development$(NC)"

setup-db: docker-up db-generate db-push db-seed-africa ## Setup database with African data
	@echo "$(GREEN)✓ Database setup complete!$(NC)"

# Quick commands
quick-start: docker-up dev ## Quick start (docker + dev server)

logs: ## View application logs
	tail -f logs/app.log

# Production commands
prod-setup: install db-generate db-migrate-deploy ## Production setup
	@echo "$(GREEN)✓ Production setup complete$(NC)"

prod-start: ## Start production server with PM2
	pm2 start bun --name africom-api -- run start

prod-stop: ## Stop production server
	pm2 stop africom-api

prod-restart: ## Restart production server
	pm2 restart africom-api

prod-logs: ## View production logs
	pm2 logs africom-api