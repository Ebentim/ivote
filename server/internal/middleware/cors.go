package middleware

import (
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

// CORSConfig returns echo CORS middleware locked to a single allowed origin.
// The origin is read from the CORS_ORIGIN env var; defaults to localhost for dev.
func CORSConfig() echo.MiddlewareFunc {
	origin := os.Getenv("CORS_ORIGIN")
	if origin == "" {
		origin = "http://localhost:5173"
	}

	return echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins:     []string{origin},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
		AllowCredentials: true,
		MaxAge:           86400,
	})
}
