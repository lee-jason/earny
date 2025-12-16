.PHONY: restart migrate extensions extension-firefox extension-chrome clean-extensions

restart:
	docker-compose down
	docker-compose up -d --build

migrate:
	npm run db:migrate

extensions: extension-firefox extension-chrome

extension-firefox:
	@mkdir -p public/extensions
	@cd extension-firefox && zip -r ../public/extensions/earny-firefox.xpi . -x "*.DS_Store"
	@echo "Created public/extensions/earny-firefox.xpi"

extension-chrome:
	@mkdir -p public/extensions
	@cd extension && zip -r ../public/extensions/earny-chrome.zip . -x "*.DS_Store"
	@echo "Created public/extensions/earny-chrome.zip"

clean-extensions:
	rm -rf public/extensions