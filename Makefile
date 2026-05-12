SHELL := /bin/zsh

PORT ?= 3000

.PHONY: default install dev-legacy test e2e build-legacy build-web smoke-build-legacy verify tauri-smoke verify-tauri build-tauri clean

# Default: Build the Tauri desktop app (omo-switch-app).
default: build-tauri

# Build the Tauri desktop application.
build-tauri:
	bun run tauri:build

# Legacy: Build the Bun HTTP server binary (server mode only).
# For Tauri app, use: bun run tauri:build
build-legacy:
	rm -rf dist
	mkdir -p dist/web
	bun build src/web/main.tsx --outdir dist/web --entry-naming='index.[ext]' --asset-naming='index.[ext]' --target=browser
	mkdir -p dist/web/fonts
	cp -R src/web/fonts/. dist/web/fonts
	bun build --compile --target=bun-macos-arm64 src/server/index.ts --outfile dist/omo-switch
	rm -rf dist/config
	cp -R config dist/config

install:
	bun install
	bun run install:playwright

build-web:
	bun run build:web

# Legacy: Run Hono HTTP server in dev mode.
# For Tauri app dev mode, use: bun run tauri:dev
dev-legacy: build-web
	bun run src/server/index.ts -p $(PORT)

test:
	bun run test

e2e:
	bun run e2e


# Legacy: Build and smoke test the Bun HTTP server binary (server mode).
# NOT used in Tauri app mode. Kept for reference only.
smoke-build-legacy: build-legacy
	test -f dist/omo-switch
	PORT=43121 NODE_ENV=test ./dist/omo-switch &
	@sleep 2
	@curl -fsS "http://127.0.0.1:43121/" >/dev/null && echo "Smoke test passed" || (echo "Smoke test failed"; exit 1)
	@pkill -f "./dist/omo-switch" || true

# Primary: Default verification — test + e2e + tauri-smoke.
# Tauri app is the canonical runtime. Server mode is legacy.
verify: verify-tauri

tauri-smoke:
	zsh scripts/tauri-smoke.sh

# Primary: Verify Tauri app (test + e2e + Tauri smoke).
# Requires: bun run tauri:build -- --target aarch64-apple-darwin first.
verify-tauri:
	$(MAKE) test
	$(MAKE) e2e
	$(MAKE) tauri-smoke

# Clean all build artifacts and temporary files.
clean:
	rm -rf dist/*
	rm -rf src-tauri/target
	rm -rf test-results
	rm -rf playwright-report
	rm -rf logs/*
	rm -rf server_logs
	find . -name '*.log' -type f -delete
	find . -name '.DS_Store' -type f -delete
	@echo "Clean complete"
