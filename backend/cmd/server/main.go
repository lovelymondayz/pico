package main

import (
	"log"
	"pico/internal/config"
	"pico/internal/handler"
	"pico/internal/middleware"
	"pico/internal/repository"
	"pico/internal/service"
	"pico/internal/storage"
	"pico/internal/util"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	// Initialize storage
	store, err := storage.NewLocalStorage(cfg.StoragePath)
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}

	// Initialize DB
	db, err := repository.NewDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := repository.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	repos := repository.NewRepositories(db)

	// Initialize services
	imageProc := util.NewImageProcessor(cfg.MaxUploadBytes)
	qrGen := util.NewQRGenerator()
	services := service.NewServices(repos, store, imageProc, qrGen, cfg)

	// Initialize handlers
	h := handler.New(services, cfg)

	// Setup router
	router := gin.Default()

	// CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
	}))

	// Rate limiting
	rateLimit := middleware.NewRateLimiter(cfg.RateLimitRequests, cfg.RateLimitWindow)

	// Public routes
	public := router.Group("/api")
	{
		public.POST("/auth/register", h.Register)
		public.POST("/auth/login", h.Login)
		public.GET("/e/:slug", h.GetEvent)
		public.POST("/e/:slug/guest", h.RegisterGuest)
		public.GET("/e/:slug/photos", h.ListPhotos)
		public.GET("/e/:slug/photos/stream", h.StreamPhotos)
		public.POST("/e/:slug/upload", rateLimit.Limit(), h.UploadPhoto)
		public.GET("/e/:slug/photos/:id", h.GetPhoto)
	}

	// Business routes (JWT required)
	business := router.Group("/api/business")
	business.Use(middleware.RequireAuth(services.Auth))
	{
		business.GET("/events", h.ListBusinessEvents)
		business.POST("/events", h.CreateEvent)
		business.PUT("/events/:id", h.UpdateEvent)
		business.DELETE("/events/:id", h.CloseEvent)
		business.GET("/events/:id/photos", h.ListEventPhotos)
		business.GET("/events/:id/download", h.DownloadPhotos)
		business.GET("/events/:id/qr", h.GenerateQR)
		business.GET("/stats", h.BusinessStats)
	}

	// Admin routes (JWT + admin role)
	admin := router.Group("/api/admin")
	admin.Use(middleware.RequireAuth(services.Auth), middleware.RequireAdmin())
	{
		admin.GET("/plans", h.ListPlans)
		admin.POST("/plans", h.CreatePlan)
		admin.PUT("/plans/:id", h.UpdatePlan)
		admin.DELETE("/plans/:id", h.DeletePlan)
		admin.GET("/businesses", h.ListAllBusinesses)
		admin.GET("/events", h.ListAllEvents)
		admin.GET("/stats", h.AdminStats)
		admin.PUT("/businesses/:id/suspend", h.SuspendBusiness)
	}

	log.Printf("Pico server starting on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
