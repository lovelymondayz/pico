FROM golang:1.18-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download || true

COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.18

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/server .
COPY internal/repository/migrations/ ./migrations/

RUN mkdir -p /data/photos

ENV PORT=8082
ENV DATABASE_URL=postgres://pico:pico@postgres:5432/pico?sslmode=disable
ENV JWT_SECRET=pico-secret-change-in-production
ENV STORAGE_PATH=/data/photos
ENV MAX_UPLOAD_BYTES=5242880

EXPOSE 8082

CMD ["./server"]
