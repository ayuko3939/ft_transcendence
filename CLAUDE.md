# CLAUDE.md
**応答は日本語でおこなってください。**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ft_transcendence is an online multiplayer Pong game built with Next.js frontend, Fastify backend, and real-time WebSocket communication. It's a monorepo using pnpm workspaces with containerized deployment.

## Development Commands

### Common Development Tasks
```bash
# Setup and initialization
pnpm install
pnpm db push                    # Initialize database schema

# Development servers
pnpm frontend dev               # Start frontend dev server (localhost:3000)
pnpm backend dev                # Start backend dev server (localhost:3001)

# Code formatting and quality
pnpm fmt                        # Format all code across workspace
pnpm frontend lint              # Lint frontend code

# Build processes
pnpm frontend build
pnpm backend build

# Database operations
pnpm db generate                # Generate migrations
pnpm db migrate                 # Apply migrations
pnpm db push                    # Push schema changes directly
```

### Docker Deployment
```bash
make min                        # Minimal stack (frontend, backend, DB, nginx, minio)
make all                        # Full stack with ELK monitoring
make down                       # Stop containers
make clean                      # Stop and remove volumes
make fclean                     # Full cleanup including images
```

## Architecture

### Monorepo Structure
- **frontend/**: Next.js 15 app with TypeScript, TailwindCSS, Next-Auth
- **backend/**: Fastify server with WebSocket support for real-time gaming
- **database/**: Drizzle ORM schema and migrations
- **shared/**: Common types, constants, and utilities
- **nginx/**: Reverse proxy configuration

### Key Technologies
- **Database**: SQLite with Drizzle ORM
- **Real-time**: WebSocket for game communication
- **Auth**: Next-Auth with email/password and Google OAuth
- **Storage**: MinIO S3-compatible object storage for avatars
- **Monitoring**: Elasticsearch, Logstash, Kibana (ELK stack)

### Service Communication
- Frontend and backend share types via `shared/` package
- WebSocket connections for real-time game state
- REST APIs for user management, tournaments, match history
- Database shared between frontend and backend via Docker volumes

## Development Patterns

### Type Safety
- Strict TypeScript across all packages
- Shared type definitions in `shared/src/types/`
- Drizzle schema provides database type safety
- WebSocket message types defined in `shared/src/types/types.ts`

### Game Architecture
- Game logic in `backend/src/services/game/GameEngine.ts`
- Frontend game rendering in `frontend/src/lib/game/gameRenderer.ts`
- WebSocket handlers in `backend/src/routes/game/socket.ts`
- Tournament system with bracket management

### Authentication Flow
- Next-Auth configuration in `frontend/src/app/api/auth/[...nextauth]/route.ts`
- Custom database adapter for user sessions
- Protected routes using middleware in `frontend/src/middleware.ts`

### File Structure Conventions
- API routes in `frontend/src/app/api/`
- Protected pages in `frontend/src/app/(authed)/`
- Auth pages in `frontend/src/app/(auth)/`
- Backend routes in `backend/src/routes/`
- Shared components use CSS modules

## Testing and Quality

### Running Tests
Check package.json files for test scripts - the project may not have comprehensive test coverage set up yet.

### Code Quality Commands
- Always run `pnpm fmt` before committing
- Use `pnpm frontend lint` to check frontend code quality
- TypeScript compilation serves as primary type checking

## Database Schema

Main tables: users, games, players, tournaments, sessions, accounts. Schema defined in `database/schema.ts` with relations in `shared/src/drizzle/relations.ts`.

## Common Issues

- Ensure MinIO and database are running when testing file uploads
- WebSocket connections require proper session authentication
- Game state synchronization depends on reliable WebSocket connection
- Tournament brackets require careful state management across multiple games