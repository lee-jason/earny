restart:
	docker-compose down
	docker-compose up -d --build

migrate:
  npm run db:migrate