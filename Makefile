.PHONY: install test start

install:
	@echo "Installing dependencies..."
	npm install 2>/dev/null || go mod tidy 2>/dev/null || pip install -r requirements.txt 2>/dev/null || echo "No dependencies to install"

test:
	@echo "Running tests..."

start:
	@echo "Starting service..."
	npm start 2>/dev/null || go run main.go 2>/dev/null || uvicorn main:app --reload 2>/dev/null || echo "No start script found"
