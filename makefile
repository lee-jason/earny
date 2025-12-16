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
	@VERSION=$$(grep '"version"' extension-firefox/manifest.json | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/') && \
	printf '{\n  "addons": {\n    "{77242f01-a203-47e5-ab4c-1fac4a5b9af5}": {\n      "updates": [\n        {\n          "version": "%s",\n          "update_link": "https://earny-red.vercel.app/extensions/earny-firefox.xpi"\n        }\n      ]\n    }\n  }\n}\n' "$$VERSION" > public/extensions/updates.json
	@echo "Created public/extensions/updates.json"

extension-chrome:
	@mkdir -p public/extensions
	@cd extension && zip -r ../public/extensions/earny-chrome.zip . -x "*.DS_Store"
	@echo "Created public/extensions/earny-chrome.zip"

clean-extensions:
	rm -rf public/extensions