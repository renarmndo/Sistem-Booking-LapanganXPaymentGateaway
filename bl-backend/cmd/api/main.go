package main

import (
	"log"

	"sistem-booking/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
