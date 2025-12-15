#!/usr/bin/env bash

set -eu

# Initialize Linera network and wallet
# Set up directories and environment variables
DIR=$HOME/wallet
mkdir -p $DIR
export LINERA_WALLET="$DIR/wallet.json"
export LINERA_KEYSTORE="$DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$DIR/wallet.db"

# Check if wallet exists, initialize if it doesn't
if [ ! -f "$LINERA_WALLET" ]; then
    echo "Wallet does not exist, initializing..."
    linera wallet init --faucet https://faucet.testnet-conway.linera.net
else
    echo "Wallet already exists, skipping initialization"
fi  

# Request a new chain and capture output (CHAIN and OWNER)
CHAIN_OWNER=($(linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net))
CHAIN="${CHAIN_OWNER[0]}"
OWNER="${CHAIN_OWNER[1]}"

# Verification (optional): Display chain information in wallet
linera wallet show

# Build backend
echo "=== Building Backend (Rust) ==="
cd /build
cargo build --release --target wasm32-unknown-unknown
echo "Publishing modules..."
APP_ID=$(linera publish-and-create target/wasm32-unknown-unknown/release/quiz_{contract,service}.wasm)

# Save CHAIN_ID and APP_ID to .env file for frontend use
ENV_FILE="/build/front-end.env"
echo "VITE_CHAIN_ID=$CHAIN" > "$ENV_FILE"
echo "VITE_APP_ID=$APP_ID" >> "$ENV_FILE"
echo "VITE_PORT=8080" >> "$ENV_FILE"
echo "VITE_HOST=localhost" >> "$ENV_FILE"
echo "Environment variables saved to: $ENV_FILE"


# Start Linera service
echo "Starting Linera service on port 8080..."
# Save backend logs to file
linera service --port 8080 > "/build/service.log" 2>&1 &
SERVICE_PID=$!
echo "Linera service started, PID: $SERVICE_PID"
echo "service logs saved to: /build/service.log"


# Build and run frontend
echo "=== Building Frontend (Vue.js) ==="
cd /build/front-end

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend development server in background
echo "=== Starting Frontend Development Server ==="
npm run dev > "/build/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend development server started, PID: $FRONTEND_PID"
echo "frontend logs saved to: /build/frontend.log"

# Wait for servers to start
echo "=== Waiting for servers to initialize... ==="
sleep 10

# Output access paths
echo "======================================"
echo "Services started, access URLs:"
echo "Frontend URL: http://localhost:5173"
echo "GraphQL URL: http://localhost:8080/chains/$CHAIN/applications/$APP_ID"
echo ""
echo "Log viewing commands:"
echo "Frontend logs: tail -f /build/frontend.log"
echo "Backend logs: tail -f /build/service.log"
echo "======================================"

# Wait for user interrupt
echo "Press Ctrl+C to stop all services"
trap "echo 'Stopping services...'; kill $SERVICE_PID $FRONTEND_PID; exit" INT
wait
