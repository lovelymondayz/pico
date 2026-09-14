package logger

import (
	"io"
	"log"
	"os"
)

var (
	infoLogger  *log.Logger
	errorLogger *log.Logger
	debugLogger *log.Logger
)

func Init() {
	flags := log.LstdFlags | log.Lshortfile
	infoLogger = log.New(os.Stdout, "INFO: ", flags)
	errorLogger = log.New(os.Stderr, "ERROR: ", flags)
	debugLogger = log.New(os.Stdout, "DEBUG: ", flags)
}

func InitWithWriter(w io.Writer) {
	flags := log.LstdFlags | log.Lshortfile
	infoLogger = log.New(w, "INFO: ", flags)
	errorLogger = log.New(w, "ERROR: ", flags)
	debugLogger = log.New(w, "DEBUG: ", flags)
}

func Info(v ...interface{}) {
	if infoLogger != nil {
		infoLogger.Println(v...)
	}
}

func Infof(format string, v ...interface{}) {
	if infoLogger != nil {
		infoLogger.Printf(format, v...)
	}
}

func Error(v ...interface{}) {
	if errorLogger != nil {
		errorLogger.Println(v...)
	}
}

func Errorf(format string, v ...interface{}) {
	if errorLogger != nil {
		errorLogger.Printf(format, v...)
	}
}

func Debug(v ...interface{}) {
	if debugLogger != nil {
		debugLogger.Println(v...)
	}
}

func Debugf(format string, v ...interface{}) {
	if debugLogger != nil {
		debugLogger.Printf(format, v...)
	}
}

func Fatal(v ...interface{}) {
	if errorLogger != nil {
		errorLogger.Fatal(v...)
	}
}

func Fatalf(format string, v ...interface{}) {
	if errorLogger != nil {
		errorLogger.Fatalf(format, v...)
	}
}
