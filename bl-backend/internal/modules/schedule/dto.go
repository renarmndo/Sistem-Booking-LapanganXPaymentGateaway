package schedule

type SlotStatus string

const (
	SlotAvailable SlotStatus = "available"
	SlotPast      SlotStatus = "past"
	SlotLocked    SlotStatus = "locked"
	SlotBooked    SlotStatus = "booked"
	SlotBlocked   SlotStatus = "blocked"
)

type SlotItem struct {
	StartTime string     `json:"start_time"`
	EndTime   string     `json:"end_time"`
	Price     int64      `json:"price"`
	Status    SlotStatus `json:"status"`
}

type FieldScheduleInfo struct {
	ID        uint
	IsActive  bool
	OpenTime  string
	CloseTime string
	IsClosed  bool
	HasHours  bool
}
