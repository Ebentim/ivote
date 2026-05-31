package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type TokenType string

const (
	TokenAdmin TokenType = "admin"
	TokenVoter TokenType = "voter"
)

type Claims struct {
	UserID   uuid.UUID `json:"userId"`
	Username string    `json:"username"`
	Role     string    `json:"role,omitempty"` // for admins: "superadmin" | "admin"
	Type     TokenType `json:"type"`
	jwt.RegisteredClaims
}

func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "dev-secret-please-change-in-production"
	}
	return []byte(s)
}

// IssueToken creates a signed JWT for the given subject.
func IssueToken(userID uuid.UUID, username, role string, tokenType TokenType, ttl time.Duration) (string, error) {
	claims := &Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		Type:     tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret())
}

// ParseToken validates and returns the claims.
func ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// extractToken pulls the bearer token from the Authorization header.
func extractToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

// ── Echo middleware ───────────────────────────────────────────────────────────

// RequireAuth validates the JWT and stores claims in echo context.
func RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		token := extractToken(c.Request())
		if token == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "authentication required")
		}
		claims, err := ParseToken(token)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid or expired token")
		}
		c.Set("claims", claims)
		return next(c)
	}
}

// RequireAdminAuth checks the token is an admin token.
func RequireAdminAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if err := RequireAuth(func(c echo.Context) error { return nil })(c); err != nil {
			return err
		}
		claims := GetClaims(c)
		if claims.Type != TokenAdmin {
			return echo.NewHTTPError(http.StatusForbidden, "admin access required")
		}
		return next(c)
	}
}

// RequireSuperAdmin checks the token belongs to a superadmin.
func RequireSuperAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if err := RequireAdminAuth(func(c echo.Context) error { return nil })(c); err != nil {
			return err
		}
		claims := GetClaims(c)
		if claims.Role != "superadmin" {
			return echo.NewHTTPError(http.StatusForbidden, "superadmin access required")
		}
		return next(c)
	}
}

// RequireVoterAuth checks the token is a voter token.
func RequireVoterAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if err := RequireAuth(func(c echo.Context) error { return nil })(c); err != nil {
			return err
		}
		claims := GetClaims(c)
		if claims.Type != TokenVoter {
			return echo.NewHTTPError(http.StatusForbidden, "voter access required")
		}
		return next(c)
	}
}

// GetClaims retrieves the claims stored in echo context.
func GetClaims(c echo.Context) *Claims {
	return c.Get("claims").(*Claims)
}
