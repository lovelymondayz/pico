FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.18

WORKDIR /app

RUN apk add --no-cache ca-certificates postgresql-client

# Create data directory owned by non-root user (1000:1000)
RUN mkdir -p /data/photos && chown -R 1000:1000 /data

COPY --from=builder /app/server .

EXPOSE 8082

# Run as non-root
USER 1000:1000

CMD ["./server"]
