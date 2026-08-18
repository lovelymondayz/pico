package util

import (
	"bytes"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"image/jpeg"

	"github.com/skip2/go-qrcode"
	"golang.org/x/image/draw"
)

type ImageProcessor struct {
	maxUploadBytes int64
}

func NewImageProcessor(maxUploadBytes int64) *ImageProcessor {
	return &ImageProcessor{maxUploadBytes: maxUploadBytes}
}

func (p *ImageProcessor) ValidateFile(size int64, contentType string) error {
	if size > p.maxUploadBytes {
		return fmt.Errorf("file too large: %d bytes (max %d)", size, p.maxUploadBytes)
	}

	allowed := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/webp": true,
	}
	if !allowed[contentType] {
		return fmt.Errorf("unsupported file type: %s", contentType)
	}

	return nil
}

func (p *ImageProcessor) ProcessImage(data []byte, maxWidth, quality int) ([]byte, int, int, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, 0, 0, fmt.Errorf("decoding image: %w", err)
	}

	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	var finalImg image.Image
	if origWidth > maxWidth {
		ratio := float64(maxWidth) / float64(origWidth)
		newHeight := int(float64(origHeight) * ratio)
		dst := image.NewRGBA(image.Rect(0, 0, maxWidth, newHeight))
		draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		finalImg = dst
	} else {
		finalImg = img
	}

	var buf bytes.Buffer
	opts := &jpeg.Options{Quality: quality}
	if err := jpeg.Encode(&buf, finalImg, opts); err != nil {
		return nil, 0, 0, fmt.Errorf("encoding image: %w", err)
	}

	finalBounds := finalImg.Bounds()
	return buf.Bytes(), finalBounds.Dx(), finalBounds.Dy(), nil
}

func (p *ImageProcessor) GenerateThumbnail(data []byte, thumbWidth int) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decoding image: %w", err)
	}

	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	if origWidth <= thumbWidth {
		return data, nil
	}

	ratio := float64(thumbWidth) / float64(origWidth)
	newHeight := int(float64(origHeight) * ratio)
	dst := image.NewRGBA(image.Rect(0, 0, thumbWidth, newHeight))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)

	var buf bytes.Buffer
	opts := &jpeg.Options{Quality: 60}
	if err := jpeg.Encode(&buf, dst, opts); err != nil {
		return nil, fmt.Errorf("encoding thumbnail: %w", err)
	}

	return buf.Bytes(), nil
}

type QRGenerator struct{}

func NewQRGenerator() *QRGenerator {
	return &QRGenerator{}
}

func (q *QRGenerator) GeneratePNG(url string, size int) ([]byte, error) {
	if size <= 0 {
		size = 256
	}
	png, err := qrcode.Encode(url, qrcode.Medium, size)
	if err != nil {
		return nil, fmt.Errorf("generating QR code: %w", err)
	}
	return png, nil
}

func DetectContentType(data []byte) string {
	if len(data) < 4 {
		return "application/octet-stream"
	}
	switch {
	case data[0] == 0xFF && data[1] == 0xD8:
		return "image/jpeg"
	case data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47:
		return "image/png"
	case data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46:
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}
