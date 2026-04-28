using System;
using System.IO;

namespace ArcLayoutSentinel.Services
{
    public class ArchivalService
    {
        public static string GenerateDestinationFolder(string rootPath, string category)
        {
            var now = DateTime.Now;
            string folderPath = Path.Combine(rootPath, now.Year.ToString(), now.ToString("MMMM"), now.Day.ToString("00"), category);
            if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);
            return folderPath;
        }

        public static string GenerateFileName(string uniqueId, string projectName, string extension)
        {
            string datePart = DateTime.Now.ToString("yyyyMMdd");
            return $"{uniqueId}_{SanitizePath(projectName)}_{datePart}.{extension.TrimStart('.')}";
        }

        private static string SanitizePath(string input)
        {
            foreach (char c in Path.GetInvalidFileNameChars())
                input = input.Replace(c, '_');
            return input.Replace(" ", "_");
        }
    }
}