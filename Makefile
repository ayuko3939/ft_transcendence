DOCKER_COMPOSE_FILE := docker-compose.yml
DOCKER_COMPOSE_FILE_MINIMUM := docker-compose.min.yml

COMMIT_HASH := $(shell git rev-parse --short HEAD)

DOCKER_COMPOSE := COMMIT_HASH=$(COMMIT_HASH) docker compose

.PHONY: all
all:
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE)  up --build -d

.PHONY: min
min:
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE_MINIMUM) up --build -d

.PHONY: down
down:
	$(DOCKER_COMPOSE) down

.PHONY: clean
clean:
	$(DOCKER_COMPOSE) down -v

.PHONY: fclean
fclean:
	$(DOCKER_COMPOSE) down -v --rmi all

.PHONY: cli
cli:
	make -C cli