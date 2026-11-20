package storage

import (
	"context"
	"io"
)

// Storage abstracts binary object persistence so local disk can be swapped for S3/MinIO.
type Storage interface {
	Save(ctx context.Context, subdir, filename string, r io.Reader) (string, error)
	Delete(ctx context.Context, publicURL string) error
}


