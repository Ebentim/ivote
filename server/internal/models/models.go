package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ── Admin ─────────────────────────────────────────────────────────────────────

type AdminRole string

const (
	RoleSuperAdmin AdminRole = "superadmin"
	RoleAdmin      AdminRole = "admin"
)

type Admin struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"            json:"id"`
	Username     string    `gorm:"uniqueIndex;not null;size:64"    json:"username"`
	Email        string    `gorm:"uniqueIndex;not null;size:255"   json:"email"`
	DisplayName  string    `gorm:"not null;size:120"               json:"displayName"`
	PasswordHash string    `gorm:"not null"                        json:"-"`
	Role         AdminRole `gorm:"not null;default:'admin'"        json:"role"`
	CreatedAt    time.Time `                                       json:"createdAt"`
	UpdatedAt    time.Time `                                       json:"updatedAt"`
}

func (a *Admin) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// ── Voter ─────────────────────────────────────────────────────────────────────

type Voter struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"            json:"id"`
	Username     string    `gorm:"uniqueIndex;not null;size:64"    json:"username"`
	DisplayName  string    `gorm:"not null;size:120"               json:"displayName"`
	PasswordHash string    `gorm:"not null"                        json:"-"`
	CreatedAt    time.Time `                                       json:"createdAt"`
	UpdatedAt    time.Time `                                       json:"updatedAt"`
}

func (v *Voter) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

// ── Election ──────────────────────────────────────────────────────────────────

type ElectionStatus string
type ElectionVisibility string

const (
	StatusDraft    ElectionStatus = "draft"
	StatusUpcoming ElectionStatus = "upcoming"
	StatusActive   ElectionStatus = "active"
	StatusEnded    ElectionStatus = "ended"

	VisPublic  ElectionVisibility = "public"
	VisPrivate ElectionVisibility = "private"
)

type Election struct {
	ID          uuid.UUID          `gorm:"type:uuid;primaryKey"         json:"id"`
	Title       string             `gorm:"not null;size:140"            json:"title"`
	Description string             `gorm:"size:500"                     json:"description"`
	Visibility  ElectionVisibility `gorm:"not null;default:'public'"    json:"visibility"`
	Status      ElectionStatus     `gorm:"not null;default:'draft'"     json:"status"`
	StartTime   time.Time          `gorm:"not null"                     json:"startTime"`
	EndTime     time.Time          `gorm:"not null"                     json:"endTime"`
	CreatedBy   uuid.UUID          `gorm:"type:uuid;not null"           json:"createdBy"`
	CreatedAt   time.Time          `                                    json:"createdAt"`
	UpdatedAt   time.Time          `                                    json:"updatedAt"`

	Contestants    []Contestant    `gorm:"foreignKey:ElectionID;constraint:OnDelete:CASCADE" json:"contestants"`
	ElectionInvites []ElectionInvite `gorm:"foreignKey:ElectionID;constraint:OnDelete:CASCADE" json:"-"`

	// Virtual fields (populated by services)
	TotalVotes    int      `gorm:"-" json:"totalVotes"`
	InvitedVoters []string `gorm:"-" json:"invitedVoters,omitempty"`
}

func (e *Election) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

// ── Contestant ────────────────────────────────────────────────────────────────

type Contestant struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"         json:"id"`
	ElectionID  uuid.UUID `gorm:"type:uuid;not null;index"     json:"electionId"`
	Name        string    `gorm:"not null;size:120"            json:"name"`
	Party       string    `gorm:"size:80"                      json:"party"`
	PassportURL string    `gorm:"size:512"                     json:"passportUrl"`
	CreatedAt   time.Time `                                    json:"createdAt"`
}

func (c *Contestant) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// ── ElectionInvite ────────────────────────────────────────────────────────────

type ElectionInvite struct {
	ElectionID uuid.UUID `gorm:"type:uuid;primaryKey" json:"electionId"`
	VoterID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"voterId"`
	InvitedAt  time.Time `                            json:"invitedAt"`
}

// ── Vote ──────────────────────────────────────────────────────────────────────
// VoterIDHash is a one-way hash of the voter's UUID — never the raw ID.
// This means votes are anonymous: no admin can reverse the hash to find the voter.

type Vote struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"     json:"id"`
	ElectionID   uuid.UUID `gorm:"type:uuid;not null;index" json:"electionId"`
	ContestantID uuid.UUID `gorm:"type:uuid;not null"       json:"contestantId"`
	VoterIDHash  string    `gorm:"not null;size:64;index"   json:"-"`
	CreatedAt    time.Time `                                json:"createdAt"`
}

func (v *Vote) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

// ── DTO types ─────────────────────────────────────────────────────────────────

type ElectionResult struct {
	ElectionID  uuid.UUID            `json:"electionId"`
	TotalVotes  int                  `json:"totalVotes"`
	Contestants []ContestantResult   `json:"contestants"`
}

type ContestantResult struct {
	Contestant
	Votes      int     `json:"votes"`
	Percentage float64 `json:"percentage"`
}
