package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"html"
	"net"
	"net/smtp"
	"strings"
	"time"

	"sistem-booking/internal/config"
)

// Sender defines email delivery operations needed by application modules.
type Sender interface {
	SendOTP(ctx context.Context, toEmail, recipientName, otpCode string, ttlMinutes int) error
}

// SMTPSender sends transactional emails via an SMTP server.
type SMTPSender struct {
	cfg config.SMTPConfig
}

func NewSMTPSender(cfg config.SMTPConfig) *SMTPSender {
	return &SMTPSender{cfg: cfg}
}

func (s *SMTPSender) SendOTP(ctx context.Context, toEmail, recipientName, otpCode string, ttlMinutes int) error {
	subject := "Kode Verifikasi OTP Akun Anda"
	body := RenderOTPEmail(recipientName, otpCode, ttlMinutes, s.cfg.FromName)
	msg := buildMIME(s.cfg.FromName, s.cfg.FromEmail, toEmail, subject, body)
	return s.send(ctx, toEmail, msg)
}

func (s *SMTPSender) send(ctx context.Context, toEmail string, msg []byte) error {
	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprintf("%d", s.cfg.Port))
	dialer := net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("dial smtp %s: %w", addr, err)
	}

	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("create smtp client: %w", err)
	}
	defer func() { _ = client.Quit() }()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}); err != nil {
			return fmt.Errorf("smtp starttls: %w", err)
		}
	}

	if s.cfg.Username != "" && s.cfg.Password != "" {
		auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}

	if err := client.Mail(sanitizeHeader(s.cfg.FromEmail)); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := client.Rcpt(sanitizeHeader(toEmail)); err != nil {
		return fmt.Errorf("smtp rcpt to: %w", err)
	}

	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := writer.Write(msg); err != nil {
		_ = writer.Close()
		return fmt.Errorf("smtp write body: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("smtp close body: %w", err)
	}
	return nil
}

// RenderOTPEmail renders an Indonesian HTML email body containing the 6-digit OTP code.
func RenderOTPEmail(recipientName, otpCode string, ttlMinutes int, appName string) string {
	safeName := html.EscapeString(strings.TrimSpace(recipientName))
	if safeName == "" {
		safeName = "Pengguna"
	}
	safeApp := html.EscapeString(strings.TrimSpace(appName))
	if safeApp == "" {
		safeApp = "Football Booking"
	}
	safeOTP := html.EscapeString(otpCode)

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Verifikasi Akun</title></head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="margin-top: 0; color: #111827;">Verifikasi Email Anda</h2>
    <p>Halo <strong>%s</strong>,</p>
    <p>Terima kasih telah mendaftar di <strong>%s</strong>. Gunakan kode OTP berikut untuk memverifikasi akun Anda:</p>
    <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 6px; text-align: center;">
      <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #111827;">%s</span>
    </div>
    <p>Kode ini berlaku selama <strong>%d menit</strong> dan hanya dapat digunakan satu kali.</p>
    <p style="font-size: 13px; color: #6b7280;">Demi keamanan, jangan bagikan kode ini kepada siapa pun. Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
  </div>
</body>
</html>`, safeName, safeApp, safeOTP, ttlMinutes)
}

func buildMIME(fromName, fromEmail, toEmail, subject, htmlBody string) []byte {
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "From: %s <%s>\r\n", sanitizeHeader(fromName), sanitizeHeader(fromEmail))
	fmt.Fprintf(&buf, "To: %s\r\n", sanitizeHeader(toEmail))
	fmt.Fprintf(&buf, "Subject: %s\r\n", sanitizeHeader(subject))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	buf.WriteString("\r\n")
	buf.WriteString(htmlBody)
	return buf.Bytes()
}

func sanitizeHeader(value string) string {
	replacer := strings.NewReplacer("\r", "", "\n", "")
	return strings.TrimSpace(replacer.Replace(value))
}
