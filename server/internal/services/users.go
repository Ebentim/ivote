package services

import (
	"errors"
	"net/http"

	"github.com/alpinesbolt/ivote/internal/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// ── Voter Service ─────────────────────────────────────────────────────────────

type VoterService struct {
	db *gorm.DB
}

func NewVoterService(db *gorm.DB) *VoterService {
	return &VoterService{db: db}
}

func (s *VoterService) ListVoters(page, pageSize int, search string) ([]models.Voter, int64, error) {
	var voters []models.Voter
	var total int64

	q := s.db.Model(&models.Voter{})
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("display_name ILIKE ? OR username ILIKE ?", like, like)
	}
	q.Count(&total)
	offset := (page - 1) * pageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&voters).Error; err != nil {
		return nil, 0, err
	}
	return voters, total, nil
}

func (s *VoterService) GetVoter(id uuid.UUID) (*models.Voter, error) {
	var voter models.Voter
	if err := s.db.First(&voter, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, echo.NewHTTPError(http.StatusNotFound, "voter not found")
		}
		return nil, err
	}
	return &voter, nil
}

type CreateVoterInput struct {
	DisplayName string `json:"displayName"`
	Username    string `json:"username"`
	Password    string `json:"password"`
}

func (s *VoterService) CreateVoter(input CreateVoterInput) (*models.Voter, error) {
	var count int64
	s.db.Model(&models.Voter{}).Where("username = ?", input.Username).Count(&count)
	if count > 0 {
		return nil, echo.NewHTTPError(http.StatusConflict, "username already taken")
	}

	hash, err := HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	voter := models.Voter{
		DisplayName:  input.DisplayName,
		Username:     input.Username,
		PasswordHash: hash,
	}
	if err := s.db.Create(&voter).Error; err != nil {
		return nil, err
	}
	return &voter, nil
}

func (s *VoterService) DeleteVoter(id uuid.UUID) error {
	return s.db.Delete(&models.Voter{}, "id = ?", id).Error
}

// ── Admin Service ─────────────────────────────────────────────────────────────

const MaxAdmins = 3

type AdminService struct {
	db *gorm.DB
}

func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{db: db}
}

func (s *AdminService) ListAdmins() ([]models.Admin, error) {
	var admins []models.Admin
	if err := s.db.Order("created_at ASC").Find(&admins).Error; err != nil {
		return nil, err
	}
	return admins, nil
}

func (s *AdminService) GetAdmin(id uuid.UUID) (*models.Admin, error) {
	var admin models.Admin
	if err := s.db.First(&admin, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, echo.NewHTTPError(http.StatusNotFound, "admin not found")
		}
		return nil, err
	}
	return &admin, nil
}

type CreateAdminInput struct {
	DisplayName string `json:"displayName"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

func (s *AdminService) CreateAdmin(input CreateAdminInput) (*models.Admin, error) {
	var total int64
	s.db.Model(&models.Admin{}).Count(&total)
	if total >= MaxAdmins {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "maximum number of administrators (3) reached")
	}

	var count int64
	s.db.Model(&models.Admin{}).Where("username = ? OR email = ?", input.Username, input.Email).Count(&count)
	if count > 0 {
		return nil, echo.NewHTTPError(http.StatusConflict, "username or email already taken")
	}

	hash, err := HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	admin := models.Admin{
		DisplayName:  input.DisplayName,
		Username:     input.Username,
		Email:        input.Email,
		PasswordHash: hash,
		Role:         models.RoleAdmin,
	}
	if err := s.db.Create(&admin).Error; err != nil {
		return nil, err
	}
	return &admin, nil
}

func (s *AdminService) DeleteAdmin(id uuid.UUID) error {
	var admin models.Admin
	if err := s.db.First(&admin, "id = ?", id).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "admin not found")
	}
	if admin.Role == models.RoleSuperAdmin {
		return echo.NewHTTPError(http.StatusForbidden, "the superadmin cannot be deleted")
	}
	return s.db.Delete(&models.Admin{}, "id = ?", id).Error
}
