FROM golang:1.27-alpine AS build

WORKDIR /src
ENV CGO_ENABLED=0

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.22

RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=build /out/api /app/api
USER app
EXPOSE 8080
ENTRYPOINT ["/app/api"]
