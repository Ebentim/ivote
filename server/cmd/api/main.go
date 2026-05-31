package main

import (
	"log"
	"net/http"
	"os"

	"github.com/alpinesbolt/ivote/internal/db"
	"github.com/alpinesbolt/ivote/internal/handlers"
	mw "github.com/alpinesbolt/ivote/internal/middleware"
	"github.com/alpinesbolt/ivote/internal/services"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// Load .env (ignore error in production where env vars are set directly)
	_ = godotenv.Load()

	// ── Database ──────────────────────────────────────────────────────────────
	database, err := db.Connect()
	if err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}

	if err := db.Migrate(database); err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	if err := db.SeedSuperAdmin(database); err != nil {
		log.Fatalf("❌ Superadmin seed failed: %v", err)
	}

	// ── Services ──────────────────────────────────────────────────────────────
	authSvc := services.NewAuthService(database)
	electionSvc := services.NewElectionService(database)
	voterSvc := services.NewVoterService(database)
	adminSvc := services.NewAdminService(database)

	// ── Handlers ──────────────────────────────────────────────────────────────
	h := handlers.New(authSvc, electionSvc, voterSvc, adminSvc)

	// ── Echo ──────────────────────────────────────────────────────────────────
	e := echo.New()
	e.HideBanner = true
	e.HidePort = false

	// Global middleware
	e.Use(mw.CORSConfig())
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.SecureWithConfig(middleware.SecureConfig{
		XSSProtection:      "1; mode=block",
		ContentTypeNosniff: "nosniff",
		XFrameOptions:      "DENY",
	}))

	// Serve uploaded files
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	e.Static("/uploads", uploadDir)

	// ── Routes ────────────────────────────────────────────────────────────────
	api := e.Group("/api")

	// Auth (public)
	auth := api.Group("/auth")
	auth.POST("/admin/login", h.AdminLogin)
	auth.POST("/voter/login", h.VoterLogin)
	auth.POST("/logout", h.Logout, mw.RequireAuth)
	auth.GET("/me", h.Me, mw.RequireAuth)

	// Admin: Elections
	adminElections := api.Group("/elections", mw.RequireAdminAuth)
	adminElections.GET("", h.ListElections)
	adminElections.POST("", h.CreateElection)
	adminElections.GET("/:id", h.GetElection)
	adminElections.PUT("/:id", h.UpdateElection)
	adminElections.PATCH("/:id/publish", h.PublishElection)
	adminElections.DELETE("/:id", h.DeleteElection)
	adminElections.GET("/:id/results", h.GetElectionResults)

	// Admin: Contestants
	adminElections.POST("/:id/contestants", h.CreateContestant)
	adminElections.PUT("/:id/contestants/:contestantId", h.UpdateContestant)
	adminElections.DELETE("/:id/contestants/:contestantId", h.DeleteContestant)

	// Admin: Invites
	adminElections.POST("/:id/invite", h.InviteVoter)
	adminElections.DELETE("/:id/invite/:voterId", h.RemoveInvite)

	// Admin: Voters
	adminVoters := api.Group("/voters", mw.RequireAdminAuth)
	adminVoters.GET("", h.ListVoters)
	adminVoters.POST("", h.CreateVoter)
	adminVoters.GET("/:id", h.GetVoter)
	adminVoters.DELETE("/:id", h.DeleteVoter)

	// Admin: Admins (superadmin only)
	adminAdmins := api.Group("/admins", mw.RequireSuperAdmin)
	adminAdmins.GET("", h.ListAdmins)
	adminAdmins.POST("", h.CreateAdmin)
	adminAdmins.DELETE("/:id", h.DeleteAdmin)

	// Upload (admin only)
	api.POST("/upload/passport", h.UploadPassport, mw.RequireAdminAuth)

	// Voter-facing
	voter := api.Group("/voter", mw.RequireVoterAuth)
	voter.GET("/elections", h.VoterListElections)
	voter.GET("/elections/:id", h.VoterGetElection)
	voter.GET("/elections/:id/results", h.VoterGetResults)
	voter.POST("/elections/:id/vote", h.VoterCastVote)
	voter.GET("/elections/:id/my-vote", h.VoterMyVote)

	// Health
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// ── Start ─────────────────────────────────────────────────────────────────
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("🗳  iVote server running on :%s", port)
	if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
