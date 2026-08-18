FROM golang:1.18-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:3.18

WORKDIR /app

RUN apk add --no-cache ca-certificates postgresql-client

COPY --from=builder /app/server .

EXPOSE 8082

CMD ["./server"]
