package report

import (
	"fmt"
	"math"
	"strings"
	"time"

	"sistem-booking/pkg/timeutil"
)

type OperatingHourRule struct {
	FieldID   uint
	DayOfWeek uint8
	OpenTime  string
	CloseTime string
	IsClosed  bool
}

type BlockInterval struct {
	FieldID       uint
	StartDatetime time.Time
	EndDatetime   time.Time
}

type UsedSlotRecord struct {
	FieldID   uint
	SlotDate  time.Time
	StartTime string
	EndTime   string
}

type FieldUtilizationCalc struct {
	FieldID            uint    `json:"field_id"`
	FieldName          string  `json:"field_name"`
	UsedHours          float64 `json:"used_hours"`
	OperationalHours   float64 `json:"operational_hours"`
	BlockedHours       float64 `json:"blocked_hours"`
	AvailableHours     float64 `json:"available_hours"`
	UtilizationPercent float64 `json:"utilization_percent"`
}

// ComputeFieldUtilization calculates field utilization across [fromDate, toDate] inclusive:
// utilization = used_hours / (operational_hours - blocked_hours), clamped to [0, 100].
func ComputeFieldUtilization(
	fieldID uint,
	fieldName string,
	fromDate time.Time,
	toDate time.Time,
	hours []OperatingHourRule,
	blocks []BlockInterval,
	usedSlots []UsedSlotRecord,
) FieldUtilizationCalc {
	hourByDay := make(map[uint8]OperatingHourRule, 7)
	for _, h := range hours {
		if h.FieldID == fieldID {
			hourByDay[h.DayOfWeek] = h
		}
	}

	var totalOpHours float64
	var totalBlockedHours float64

	cur := timeutil.StartOfDay(fromDate)
	endDay := timeutil.StartOfDay(toDate)
	for !cur.After(endDay) {
		dow := uint8(cur.Weekday())
		rule, ok := hourByDay[dow]
		if ok && !rule.IsClosed {
			openMin, errO := parseClockMin(rule.OpenTime)
			closeMin, errC := parseClockMin(rule.CloseTime)
			if errO == nil && errC == nil && closeMin > openMin {
				dayStart := time.Date(cur.Year(), cur.Month(), cur.Day(), openMin/60, openMin%60, 0, 0, timeutil.WIB)
				dayEnd := time.Date(cur.Year(), cur.Month(), cur.Day(), closeMin/60, closeMin%60, 0, 0, timeutil.WIB)
				totalOpHours += dayEnd.Sub(dayStart).Hours()

				for _, b := range blocks {
					if b.FieldID != fieldID {
						continue
					}
					overlapStart := maxTime(dayStart, b.StartDatetime.In(timeutil.WIB))
					overlapEnd := minTime(dayEnd, b.EndDatetime.In(timeutil.WIB))
					if overlapEnd.After(overlapStart) {
						totalBlockedHours += overlapEnd.Sub(overlapStart).Hours()
					}
				}
			}
		}
		cur = cur.AddDate(0, 0, 1)
	}

	var usedHours float64
	for _, sl := range usedSlots {
		if sl.FieldID != fieldID {
			continue
		}
		sMin, errS := parseClockMin(sl.StartTime)
		eMin, errE := parseClockMin(sl.EndTime)
		if errS == nil && errE == nil && eMin > sMin {
			usedHours += float64(eMin-sMin) / 60.0
		}
	}

	availableHours := totalOpHours - totalBlockedHours
	if availableHours < 0 {
		availableHours = 0
	}

	var pct float64
	if availableHours > 0 {
		pct = (usedHours / availableHours) * 100.0
		if pct > 100 {
			pct = 100
		}
	}

	return FieldUtilizationCalc{
		FieldID:            fieldID,
		FieldName:          fieldName,
		UsedHours:          round2(usedHours),
		OperationalHours:   round2(totalOpHours),
		BlockedHours:       round2(totalBlockedHours),
		AvailableHours:     round2(availableHours),
		UtilizationPercent: round2(pct),
	}
}

func BuildHeatmapAndQuietHours(usedSlots []UsedSlotRecord) ([]HeatmapCell, []string) {
	counts := make(map[string]int64)
	hourTotals := make(map[int]int64)

	for _, sl := range usedSlots {
		sMin, err := parseClockMin(sl.StartTime)
		if err != nil {
			continue
		}
		hour := sMin / 60
		dow := int(sl.SlotDate.In(timeutil.WIB).Weekday())
		key := fmt.Sprintf("%d:%d", dow, hour)
		counts[key]++
		hourTotals[hour]++
	}

	var cells []HeatmapCell
	for dow := 0; dow < 7; dow++ {
		for hour := 8; hour <= 22; hour++ {
			key := fmt.Sprintf("%d:%d", dow, hour)
			cells = append(cells, HeatmapCell{
				DayOfWeek: dow,
				Hour:      fmt.Sprintf("%02d:00", hour),
				Count:     counts[key],
			})
		}
	}

	var quiet []string
	var minCount int64 = math.MaxInt64
	for hour := 8; hour <= 22; hour++ {
		if c := hourTotals[hour]; c < minCount {
			minCount = c
		}
	}
	for hour := 8; hour <= 22; hour++ {
		if hourTotals[hour] == minCount && len(quiet) < 5 {
			quiet = append(quiet, fmt.Sprintf("%02d:00", hour))
		}
	}
	return cells, quiet
}

func parseClockMin(raw string) (int, error) {
	trimmed := strings.TrimSpace(raw)
	if len(trimmed) >= 5 {
		trimmed = trimmed[:5]
	}
	t, err := timeutil.ParseClock(trimmed)
	if err != nil {
		return 0, err
	}
	return t.Hour()*60 + t.Minute(), nil
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func maxTime(a, b time.Time) time.Time {
	if a.After(b) {
		return a
	}
	return b
}

func minTime(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}
