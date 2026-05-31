package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/alpinesbolt/ivote/internal/middleware"
	"github.com/alpinesbolt/ivote/internal/models"
	"github.com/alpinesbolt/ivote/internal/services"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// ── Response helpers ──────────────────────────────────────────────────────────

func ok(c echo.Context, data any) error {
	return c.JSON(http.StatusOK, map[string]any{"data": data})
}

func okMsg(c echo.Context, data any, message string) error {
	return c.JSON(http.StatusOK, map[string]any{"data": data, "message": message})
}

func created(c echo.Context, data any) error {
	return c.JSON(http.StatusCreated, map[string]any{"data": data})
}

func paginated(c echo.Context, data any, total int64, page, pageSize int) error {
	return c.JSON(http.StatusOK, map[string]any{
		"data":     data,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func parseUUID(c echo.Context, param string) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Param(param))
	if err != nil {
		return uuid.Nil, echo.NewHTTPError(http.StatusBadRequest, "invalid id")
	}
	return id, nil
}

func parsePage(c echo.Context) (int, int) {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.QueryParam("pageSize"))
	if pageSize < 1 || pageSize > 200 {
		pageSize = 50
	}
	return page, pageSize
}

// ── Handler container ─────────────────────────────────────────────────────────

type Handlers struct {
	auth     *services.AuthService
	election *services.ElectionService
	voter    *services.VoterService
	admin    *services.AdminService
}

func New(
	auth *services.AuthService,
	election *services.ElectionService,
	voter *services.VoterService,
	admin *services.AdminService,
) *Handlers {
	return &Handlers{auth, election, voter, admin}
}

// ── Auth handlers ─────────────────────────────────────────────────────────────

func (h *Handlers) AdminLogin(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	token, admin, err := h.auth.AdminLogin(req.Username, req.Password)
	if err != nil {
		return err
	}
	return ok(c, map[string]any{"token": token, "admin": admin})
}

func (h *Handlers) VoterLogin(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	token, voter, err := h.auth.VoterLogin(req.Username, req.Password)
	if err != nil {
		return err
	}
	return ok(c, map[string]any{"token": token, "voter": voter})
}

func (h *Handlers) Logout(c echo.Context) error {
	// JWT is stateless; client discards the token.
	return ok(c, map[string]any{"message": "logged out"})
}

func (h *Handlers) Me(c echo.Context) error {
	claims := middleware.GetClaims(c)
	if claims.Type == middleware.TokenAdmin {
		admin, err := h.admin.GetAdmin(claims.UserID)
		if err != nil {
			return err
		}
		return ok(c, admin)
	}
	voter, err := h.voter.GetVoter(claims.UserID)
	if err != nil {
		return err
	}
	return ok(c, voter)
}

// ── Admin: Elections ──────────────────────────────────────────────────────────

func (h *Handlers) ListElections(c echo.Context) error {
	page, pageSize := parsePage(c)
	status := c.QueryParam("status")
	elections, total, err := h.election.ListElections(page, pageSize, status)
	if err != nil {
		return err
	}
	return paginated(c, elections, total, page, pageSize)
}

func (h *Handlers) GetElection(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	e, err := h.election.GetElection(id)
	if err != nil {
		return err
	}
	return ok(c, e)
}

func (h *Handlers) CreateElection(c echo.Context) error {
	claims := middleware.GetClaims(c)
	var req struct {
		Title       string                    `json:"title"`
		Description string                    `json:"description"`
		Visibility  models.ElectionVisibility `json:"visibility"`
		StartTime   time.Time                 `json:"startTime"`
		EndTime     time.Time                 `json:"endTime"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	e, err := h.election.CreateElection(services.CreateElectionInput{
		Title:       req.Title,
		Description: req.Description,
		Visibility:  req.Visibility,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		CreatedBy:   claims.UserID,
	})
	if err != nil {
		return err
	}
	return created(c, e)
}

func (h *Handlers) UpdateElection(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	var req services.UpdateElectionInput
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	e, err := h.election.UpdateElection(id, req)
	if err != nil {
		return err
	}
	return ok(c, e)
}

func (h *Handlers) PublishElection(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	e, err := h.election.PublishElection(id)
	if err != nil {
		return err
	}
	return ok(c, e)
}

func (h *Handlers) DeleteElection(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	if err := h.election.DeleteElection(id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handlers) GetElectionResults(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	results, err := h.election.GetResults(id)
	if err != nil {
		return err
	}
	return ok(c, results)
}

// ── Admin: Contestants ────────────────────────────────────────────────────────

func (h *Handlers) CreateContestant(c echo.Context) error {
	electionID, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	var req struct {
		Name        string `json:"name"`
		Party       string `json:"party"`
		PassportURL string `json:"passportUrl"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	contestant, err := h.election.CreateContestant(electionID, req.Name, req.Party, req.PassportURL)
	if err != nil {
		return err
	}
	return created(c, contestant)
}

func (h *Handlers) UpdateContestant(c echo.Context) error {
	electionID, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	contestantID, err := parseUUID(c, "contestantId")
	if err != nil {
		return err
	}
	var req struct {
		Name        *string `json:"name"`
		Party       *string `json:"party"`
		PassportURL *string `json:"passportUrl"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	c2, err := h.election.UpdateContestant(electionID, contestantID, req.Name, req.Party, req.PassportURL)
	if err != nil {
		return err
	}
	return ok(c, c2)
}

func (h *Handlers) DeleteContestant(c echo.Context) error {
	electionID, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	contestantID, err := parseUUID(c, "contestantId")
	if err != nil {
		return err
	}
	if err := h.election.DeleteContestant(electionID, contestantID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// ── Admin: Invites ────────────────────────────────────────────────────────────

func (h *Handlers) InviteVoter(c echo.Context) error {
	electionID, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	var req struct {
		VoterID string `json:"voterId"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	voterID, err := uuid.Parse(req.VoterID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid voter id")
	}
	if err := h.election.InviteVoter(electionID, voterID); err != nil {
		return err
	}
	return ok(c, map[string]any{"message": "voter invited"})
}

func (h *Handlers) RemoveInvite(c echo.Context) error {
	electionID, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	voterID, err := parseUUID(c, "voterId")
	if err != nil {
		return err
	}
	if err := h.election.RemoveInvite(electionID, voterID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// ── Admin: Voters ─────────────────────────────────────────────────────────────

func (h *Handlers) ListVoters(c echo.Context) error {
	page, pageSize := parsePage(c)
	search := c.QueryParam("search")
	voters, total, err := h.voter.ListVoters(page, pageSize, search)
	if err != nil {
		return err
	}
	return paginated(c, voters, total, page, pageSize)
}

func (h *Handlers) CreateVoter(c echo.Context) error {
	var req services.CreateVoterInput
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	voter, err := h.voter.CreateVoter(req)
	if err != nil {
		return err
	}
	return created(c, voter)
}

func (h *Handlers) GetVoter(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	voter, err := h.voter.GetVoter(id)
	if err != nil {
		return err
	}
	return ok(c, voter)
}

func (h *Handlers) DeleteVoter(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	if err := h.voter.DeleteVoter(id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// ── Admin: Admins ─────────────────────────────────────────────────────────────

func (h *Handlers) ListAdmins(c echo.Context) error {
	admins, err := h.admin.ListAdmins()
	if err != nil {
		return err
	}
	return ok(c, admins)
}

func (h *Handlers) CreateAdmin(c echo.Context) error {
	var req services.CreateAdminInput
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	admin, err := h.admin.CreateAdmin(req)
	if err != nil {
		return err
	}
	return created(c, admin)
}

func (h *Handlers) DeleteAdmin(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	if err := h.admin.DeleteAdmin(id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

// ── Voter-facing endpoints ────────────────────────────────────────────────────

func (h *Handlers) VoterListElections(c echo.Context) error {
	claims := middleware.GetClaims(c)
	elections, err := h.election.ListElectionsForVoter(claims.UserID)
	if err != nil {
		return err
	}
	return ok(c, elections)
}

func (h *Handlers) VoterGetElection(c echo.Context) error {
	claims := middleware.GetClaims(c)
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	e, err := h.election.GetElection(id)
	if err != nil {
		return err
	}

	// Access check
	if e.Status == models.StatusDraft {
		return echo.NewHTTPError(http.StatusNotFound, "election not found")
	}
	if e.Visibility == models.VisPrivate {
		found := false
		for _, vid := range e.InvitedVoters {
			if vid == claims.UserID.String() {
				found = true
				break
			}
		}
		if !found {
			return echo.NewHTTPError(http.StatusForbidden, "you are not invited to this election")
		}
	}
	return ok(c, e)
}

func (h *Handlers) VoterGetResults(c echo.Context) error {
	id, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	results, err := h.election.GetResults(id)
	if err != nil {
		return err
	}
	return ok(c, results)
}

func (h *Handlers) VoterCastVote(c echo.Context) error {
	claims := middleware.GetClaims(c)
	electionID, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	var req struct {
		ContestantID string `json:"contestantId"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	contestantID, err := uuid.Parse(req.ContestantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid contestant id")
	}
	if err := h.election.CastVote(electionID, contestantID, claims.UserID); err != nil {
		return err
	}
	return ok(c, map[string]any{"message": "vote cast successfully"})
}

func (h *Handlers) VoterMyVote(c echo.Context) error {
	claims := middleware.GetClaims(c)
	electionID, err := parseUUID(c, "id")
	if err != nil {
		return err
	}
	voted, contestantID := h.election.HasVoted(electionID, claims.UserID)
	resp := map[string]any{"voted": voted}
	if contestantID != nil {
		resp["contestantId"] = contestantID.String()
	}
	return ok(c, resp)
}

// ── File upload ───────────────────────────────────────────────────────────────

func (h *Handlers) UploadPassport(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file is required")
	}

	// Validate content type
	ct := file.Header.Get("Content-Type")
	allowed := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
	}
	ext, valid := allowed[ct]
	if !valid {
		return echo.NewHTTPError(http.StatusBadRequest, "only JPEG, PNG, and WebP images are allowed")
	}

	// Max 3 MB
	if file.Size > 3*1024*1024 {
		return echo.NewHTTPError(http.StatusBadRequest, "file too large — maximum 3 MB")
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads/passports"
	}
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return err
	}

	filename := uuid.New().String() + ext
	dst := filepath.Join(uploadDir, filename)

	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	buf := make([]byte, 32*1024)
	for {
		n, readErr := src.Read(buf)
		if n > 0 {
			out.Write(buf[:n])
		}
		if readErr != nil {
			break
		}
	}

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	url := strings.TrimRight(baseURL, "/") + "/uploads/passports/" + filename
	return ok(c, map[string]any{"url": url})
}
