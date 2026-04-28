using System;
using System.IO;
using Serilog;
using Serilog.Core;

namespace ArcLayoutSentinel.Services
{
    public static class Logger
    {
        private static ILogger _log;

        public static void Initialize()
        {
            if (_log != null) return;

            string logDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ArcLayoutSentinel", "Logs");
            if (!Directory.Exists(logDir)) Directory.CreateDirectory(logDir);

            string logFile = Path.Combine(logDir, "sentinel-.log");

            _log = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.File(logFile, rollingInterval: RollingInterval.Day, retainedFileCountLimit: 7,
                    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
                .CreateLogger();

            _log.Information("Sentinel Logging Initialized.");
        }

        public static void Info(string message, params object[] args) => _log?.Information(message, args);
        public static void Debug(string message, params object[] args) => _log?.Debug(message, args);
        public static void Warn(string message, params object[] args) => _log?.Warning(message, args);
        public static void Error(string message, params object[] args) => _log?.Error(message, args);
        public static void Error(Exception ex, string message, params object[] args) => _log?.Error(ex, message, args);
    }
}