package services

import (
	"errors"
	"net/http"
	"time"

	"github.com/alpinesbolt/ivote/internal/models"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type ElectionService struct {
	db *gorm.DB
}

func NewElectionService(db *gorm.DB) *ElectionService {
	return &ElectionService{db: db}
}

// ── Election CRUD ─────────────────────────────────────────────────────────────

func (s *ElectionService) ListElections(page, pageSize int, status string) ([]models.Election, int64, error) {
	var elections []models.Election
	var total int64

	q := s.db.Model(&models.Election{}).Preload("Contestants")
	if status != "" && status != "all" {
		q = q.Where("status = ?", status)
	}

	q.Count(&total)
	offset := (page - 1) * pageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&elections).Error; err != nil {
		return nil, 0, err
	}

	// Populate virtual fields
	for i := range elections {
		s.populateVirtual(&elections[i])
	}
	return elections, total, nil
}

func (s *ElectionService) GetElection(id uuid.UUID) (*models.Election, error) {
	var election models.Election
	if err := s.db.Preload("Contestants").First(&election, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, echo.NewHTTPError(http.StatusNotFound, "election not found")
		}
		return nil, err
	}
	s.populateVirtual(&election)
	return &election, nil
}

type CreateElectionInput struct {
	Title       string                   `json:"title"`
	Description string                   `json:"description"`
	Visibility  models.ElectionVisibility `json:"visibility"`
	StartTime   time.Time                `json:"startTime"`
	EndTime     time.Time                `json:"endTime"`
	CreatedBy   uuid.UUID
}

func (s *ElectionService) CreateElection(input CreateElectionInput) (*models.Election, error) {
	if err := validateElectionDuration(input.StartTime, input.EndTime); err != nil {
		return nil, err
	}

	election := models.Election{
		Title:       input.Title,
		Description: input.Description,
		Visibility:  input.Visibility,
		Status:      models.StatusDraft,
		StartTime:   input.StartTime,
		EndTime:     input.EndTime,
		CreatedBy:   input.CreatedBy,
	}
	if err := s.db.Create(&election).Error; err != nil {
		return nil, err
	}
	return &election, nil
}

type UpdateElectionInput struct {
	Title       *string                   `json:"title"`
	Description *string                   `json:"description"`
	Visibility  *models.ElectionVisibility `json:"visibility"`
	StartTime   *time.Time                `json:"startTime"`
	EndTime     *time.Time                `json:"endTime"`
}

func (s *ElectionService) UpdateElection(id uuid.UUID, input UpdateElectionInput) (*models.Election, error) {
	election, err := s.GetElection(id)
	if err != nil {
		return nil, err
	}
	if election.Status != models.StatusDraft {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "only draft elections can be updated")
	}

	updates := map[string]any{}
	if input.Title != nil       { updates["title"] = *input.Title }
	if input.Description != nil { updates["description"] = *input.Description }
	if input.Visibility != nil  { updates["visibility"] = *input.Visibility }
	if input.StartTime != nil   { updates["start_time"] = *input.StartTime }
	if input.EndTime != nil     { updates["end_time"] = *input.EndTime }

	if err := s.db.Model(election).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.GetElection(id)
}

func (s *ElectionService) PublishElection(id uuid.UUID) (*models.Election, error) {
	election, err := s.GetElection(id)
	if err != nil {
		return nil, err
	}
	if election.Status != models.StatusDraft {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "election is already published")
	}
	if len(election.Contestants) < 2 {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "election must have at least 2 contestants before publishing")
	}

	now := time.Now()
	var newStatus models.ElectionStatus
	switch {
	case now.Before(election.StartTime):
		newStatus = models.StatusUpcoming
	case now.After(election.EndTime):
		newStatus = models.StatusEnded
	default:
		newStatus = models.StatusActive
	}

	if err := s.db.Model(election).Update("status", newStatus).Error; err != nil {
		return nil, err
	}
	return s.GetElection(id)
}

func (s *ElectionService) DeleteElection(id uuid.UUID) error {
	election, err := s.GetElection(id)
	if err != nil {
		return err
	}
	if election.Status == models.StatusActive {
		return echo.NewHTTPError(http.StatusBadRequest, "cannot delete an active election")
	}
	return s.db.Delete(&models.Election{}, "id = ?", id).Error
}

// ── Results ───────────────────────────────────────────────────────────────────

func (s *ElectionService) GetResults(electionID uuid.UUID) (*models.ElectionResult, error) {
	election, err := s.GetElection(electionID)
	if err != nil {
		return nil, err
	}

	type voteCount struct {
		ContestantID uuid.UUID
		Count        int
	}
	var counts []voteCount
	s.db.Model(&models.Vote{}).
		Select("contestant_id, count(*) as count").
		Where("election_id = ?", electionID).
		Group("contestant_id").
		Scan(&counts)

	countMap := make(map[uuid.UUID]int)
	total := 0
	for _, vc := range counts {
		countMap[vc.ContestantID] = vc.Count
		total += vc.Count
	}

	results := models.ElectionResult{
		ElectionID: electionID,
		TotalVotes: total,
	}
	for _, c := range election.Contestants {
		votes := countMap[c.ID]
		pct := 0.0
		if total > 0 {
			pct = float64(votes) / float64(total) * 100
		}
		results.Contestants = append(results.Contestants, models.ContestantResult{
			Contestant: c,
			Votes:      votes,
			Percentage: pct,
		})
	}
	return &results, nil
}

// ── Invite management ─────────────────────────────────────────────────────────

func (s *ElectionService) InviteVoter(electionID, voterID uuid.UUID) error {
	var count int64
	s.db.Model(&models.ElectionInvite{}).
		Where("election_id = ? AND voter_id = ?", electionID, voterID).
		Count(&count)
	if count > 0 {
		return nil // already invited
	}
	return s.db.Create(&models.ElectionInvite{
		ElectionID: electionID,
		VoterID:    voterID,
		InvitedAt:  time.Now(),
	}).Error
}

func (s *ElectionService) RemoveInvite(electionID, voterID uuid.UUID) error {
	return s.db.Delete(&models.ElectionInvite{},
		"election_id = ? AND voter_id = ?", electionID, voterID).Error
}

// ── Voting ────────────────────────────────────────────────────────────────────

func (s *ElectionService) CastVote(electionID, contestantID, voterID uuid.UUID) error {
	election, err := s.GetElection(electionID)
	if err != nil {
		return err
	}

	// Status check
	if election.Status != models.StatusActive {
		return echo.NewHTTPError(http.StatusBadRequest, "this election is not currently active")
	}
	// Time boundary double-check
	now := time.Now()
	if now.Before(election.StartTime) || now.After(election.EndTime) {
		return echo.NewHTTPError(http.StatusBadRequest, "this election is not currently active")
	}

	// Access check for private elections
	if election.Visibility == models.VisPrivate {
		var count int64
		s.db.Model(&models.ElectionInvite{}).
			Where("election_id = ? AND voter_id = ?", electionID, voterID).
			Count(&count)
		if count == 0 {
			return echo.NewHTTPError(http.StatusForbidden, "you are not invited to this election")
		}
	}

	// Contestant exists?
	var contestant models.Contestant
	if err := s.db.First(&contestant, "id = ? AND election_id = ?", contestantID, electionID).Error; err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "contestant not found in this election")
	}

	// Duplicate vote check (anonymous hash)
	hash := AnonymiseVoterID(voterID)
	var count int64
	s.db.Model(&models.Vote{}).
		Where("election_id = ? AND voter_id_hash = ?", electionID, hash).
		Count(&count)
	if count > 0 {
		return echo.NewHTTPError(http.StatusConflict, "you have already voted in this election")
	}

	return s.db.Create(&models.Vote{
		ElectionID:   electionID,
		ContestantID: contestantID,
		VoterIDHash:  hash,
	}).Error
}

// HasVoted returns whether the voter has voted and which contestant they chose (by hash lookup).
func (s *ElectionService) HasVoted(electionID, voterID uuid.UUID) (bool, *uuid.UUID) {
	hash := AnonymiseVoterID(voterID)
	var vote models.Vote
	err := s.db.Where("election_id = ? AND voter_id_hash = ?", electionID, hash).First(&vote).Error
	if err != nil {
		return false, nil
	}
	return true, &vote.ContestantID
}

// ── Voter-facing election list ────────────────────────────────────────────────

func (s *ElectionService) ListElectionsForVoter(voterID uuid.UUID) ([]models.Election, error) {
	var elections []models.Election

	// Public elections + private elections where the voter is invited
	err := s.db.Preload("Contestants").
		Joins("LEFT JOIN election_invites ei ON ei.election_id = elections.id AND ei.voter_id = ?", voterID).
		Where("elections.visibility = 'public' OR ei.voter_id = ?", voterID).
		Where("elections.status != 'draft'").
		Order("elections.created_at DESC").
		Find(&elections).Error
	if err != nil {
		return nil, err
	}

	for i := range elections {
		s.populateVirtual(&elections[i])
	}
	return elections, nil
}

// ── Contestant management ─────────────────────────────────────────────────────

func (s *ElectionService) CreateContestant(electionID uuid.UUID, name, party, passportURL string) (*models.Contestant, error) {
	c := models.Contestant{
		ElectionID:  electionID,
		Name:        name,
		Party:       party,
		PassportURL: passportURL,
	}
	if err := s.db.Create(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *ElectionService) UpdateContestant(electionID, contestantID uuid.UUID, name, party, passportURL *string) (*models.Contestant, error) {
	var c models.Contestant
	if err := s.db.First(&c, "id = ? AND election_id = ?", contestantID, electionID).Error; err != nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "contestant not found")
	}
	updates := map[string]any{}
	if name != nil        { updates["name"] = *name }
	if party != nil       { updates["party"] = *party }
	if passportURL != nil { updates["passport_url"] = *passportURL }
	if err := s.db.Model(&c).Updates(updates).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *ElectionService) DeleteContestant(electionID, contestantID uuid.UUID) error {
	return s.db.Delete(&models.Contestant{}, "id = ? AND election_id = ?", contestantID, electionID).Error
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (s *ElectionService) populateVirtual(e *models.Election) {
	var total int64
	s.db.Model(&models.Vote{}).Where("election_id = ?", e.ID).Count(&total)
	e.TotalVotes = int(total)

	if e.Visibility == models.VisPrivate {
		var invites []models.ElectionInvite
		s.db.Where("election_id = ?", e.ID).Find(&invites)
		ids := make([]string, len(invites))
		for i, inv := range invites {
			ids[i] = inv.VoterID.String()
		}
		e.InvitedVoters = ids
	}
}

func validateElectionDuration(start, end time.Time) error {
	dur := end.Sub(start)
	if dur < 15*time.Minute {
		return echo.NewHTTPError(http.StatusBadRequest, "election must be at least 15 minutes long")
	}
	if dur > 30*24*time.Hour {
		return echo.NewHTTPError(http.StatusBadRequest, "election cannot exceed 30 days")
	}
	return nil
}
