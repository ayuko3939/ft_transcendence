DOCKER_COMPOSE_FILE := docker-compose.yml

COMMIT_HASH := $(shell git rev-parse --short HEAD)

DOCKER_COMPOSE := COMMIT_HASH=$(COMMIT_HASH) docker compose -f $(DOCKER_COMPOSE_FILE)

.PHONY: all
all:
	$(DOCKER_COMPOSE) up --build

.PHONY: down
down:
	$(DOCKER_COMPOSE) down

.PHONY: clean
clean:
	$(DOCKER_COMPOSE) down -v

.PHONY: fclean
fclean:
	$(DOCKER_COMPOSE) down -v --rmi all
