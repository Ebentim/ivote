package db

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/alpinesbolt/ivote/internal/models"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect opens a Postgres connection.
//
// Priority order for the DSN:
//  1. DATABASE_URL  — full connection string (Supabase, Neon, Railway, etc.)
//     Accepts both postgres:// and postgresql:// schemes.
//  2. DB_URL        — alias for DATABASE_URL (some providers export this name)
//  3. Individual vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSLMODE
//
// When a URL-style DSN is detected the driver receives it as-is so that
// provider-specific parameters (sslmode=require, channel_binding, etc.) are
// preserved exactly as the provider intends.
func Connect() (*gorm.DB, error) {
	dsn := resolvedDSN()
	if dsn == "" {
		return nil, fmt.Errorf(
			"no database configuration found — set DATABASE_URL (or DB_URL) " +
				"to a postgres connection string, or set DB_HOST / DB_USER / DB_PASSWORD / DB_NAME",
		)
	}

	logLevel := logger.Silent
	if os.Getenv("APP_ENV") == "development" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Connection pool — sensible defaults for managed Postgres (Supabase / Neon
	// have per-plan connection limits; stay conservative).
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	DB = db
	log.Println("✅ Database connected")
	return db, nil
}

// resolvedDSN returns the best available DSN string.
func resolvedDSN() string {
	// 1. DATABASE_URL (standard across most providers)
	if v := os.Getenv("DATABASE_URL"); v != "" {
		return normaliseURL(v)
	}
	// 2. DB_URL (Neon sometimes uses this name in their dashboard snippets)
	if v := os.Getenv("DB_URL"); v != "" {
		return normaliseURL(v)
	}
	// 3. Individual connection vars (local / self-hosted)
	host := getEnv("DB_HOST", "")
	if host == "" {
		return ""
	}
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		host,
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "ivote"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_SSLMODE", "disable"),
	)
}

// normaliseURL converts a postgresql:// URL to postgres:// which the pgx
// driver expects, leaving all other query parameters untouched.
func normaliseURL(raw string) string {
	if strings.HasPrefix(raw, "postgresql://") {
		return "postgres://" + raw[len("postgresql://"):]
	}
	return raw
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Admin{},
		&models.Voter{},
		&models.Election{},
		&models.Contestant{},
		&models.ElectionInvite{},
		&models.Vote{},
	)
}

// SeedSuperAdmin creates the superadmin on first run if it doesn't exist.
func SeedSuperAdmin(db *gorm.DB) error {
	username := getEnv("SUPERADMIN_USERNAME", "admin")
	password := getEnv("SUPERADMIN_PASSWORD", "changeme123!")
	email := getEnv("SUPERADMIN_EMAIL", "admin@ivote.local")
	name := getEnv("SUPERADMIN_NAME", "System Administrator")

	var count int64
	db.Model(&models.Admin{}).Where("role = ?", models.RoleSuperAdmin).Count(&count)
	if count > 0 {
		return nil // already seeded
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	superadmin := models.Admin{
		ID:           uuid.New(),
		Username:     username,
		Email:        email,
		DisplayName:  name,
		PasswordHash: string(hash),
		Role:         models.RoleSuperAdmin,
	}

	if err := db.Create(&superadmin).Error; err != nil {
		return fmt.Errorf("failed to seed superadmin: %w", err)
	}

	log.Printf("✅ Superadmin seeded: username=%q  password=%q — change this in production!", username, password)
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
