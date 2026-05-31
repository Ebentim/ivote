package services

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/alpinesbolt/ivote/internal/middleware"
	"github.com/alpinesbolt/ivote/internal/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{db: db}
}

const adminTokenTTL = 12 * time.Hour
const voterTokenTTL = 24 * time.Hour

// HashPassword uses bcrypt.
func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

// CheckPassword compares plaintext against a bcrypt hash.
func CheckPassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// AnonymiseVoterID returns a stable, one-way hash of the voter UUID.
// A per-deployment secret pepper is mixed in so raw IDs cannot be brute-forced.
func AnonymiseVoterID(voterID uuid.UUID) string {
	pepper := os.Getenv("VOTE_PEPPER")
	if pepper == "" {
		pepper = "ivote-default-pepper-change-in-production"
	}
	h := sha256.Sum256([]byte(voterID.String() + pepper))
	return fmt.Sprintf("%x", h)
}

// ── Admin auth ────────────────────────────────────────────────────────────────

func (s *AuthService) AdminLogin(username, password string) (string, *models.Admin, error) {
	var admin models.Admin
	if err := s.db.Where("username = ?", username).First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid credentials")
		}
		return "", nil, err
	}

	if err := CheckPassword(admin.PasswordHash, password); err != nil {
		return "", nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid credentials")
	}

	token, err := middleware.IssueToken(admin.ID, admin.Username, string(admin.Role), middleware.TokenAdmin, adminTokenTTL)
	if err != nil {
		return "", nil, err
	}
	return token, &admin, nil
}

// ── Voter auth ────────────────────────────────────────────────────────────────

func (s *AuthService) VoterLogin(username, password string) (string, *models.Voter, error) {
	var voter models.Voter
	if err := s.db.Where("username = ?", username).First(&voter).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid credentials")
		}
		return "", nil, err
	}

	if err := CheckPassword(voter.PasswordHash, password); err != nil {
		return "", nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid credentials")
	}

	token, err := middleware.IssueToken(voter.ID, voter.Username, "", middleware.TokenVoter, voterTokenTTL)
	if err != nil {
		return "", nil, err
	}
	return token, &voter, nil
}
