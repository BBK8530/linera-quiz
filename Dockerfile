FROM rust:1.86-slim AS builder

SHELL ["bash", "-c"]

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    protobuf-compiler \
    libprotobuf-dev \
    clang \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install --locked linera-service@0.15.7 linera-storage-service@0.15.7

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /build

FROM builder AS runtime

WORKDIR /build

# Copy only necessary files from builder
COPY --from=builder /usr/local/cargo/bin/ /usr/local/cargo/bin/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY --from=builder /usr/bin/node /usr/bin/node
COPY --from=builder /usr/bin/npm /usr/bin/npm
COPY --from=builder /usr/bin/pnpm /usr/bin/pnpm

# Expose necessary ports
EXPOSE 5173 8080 9001 13001

# Health checks for both frontend and backend
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -s http://localhost:5173 || curl -s http://localhost:8080

ENTRYPOINT bash /build/run.bash
