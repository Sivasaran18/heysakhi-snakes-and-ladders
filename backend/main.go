package main

import (
	"fmt"
	"heysakhi-snakes-ladders/server"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	hub := server.NewHub()
	go hub.Run()

	mux := server.SetupRoutes(hub)

	// Add CORS support for local development / Expo / Web
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		mux.ServeHTTP(w, r)
	})

	addr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("==================================================")
	log.Printf(" HeySakhi Snakes & Ladders Backend Server")
	log.Printf(" Board: 50 Squares (5 cols x 10 rows serpentine)")
	log.Printf(" Listening on http://%s", addr)
	log.Printf(" WebSocket endpoint: ws://%s/ws", addr)
	log.Printf("==================================================")

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

