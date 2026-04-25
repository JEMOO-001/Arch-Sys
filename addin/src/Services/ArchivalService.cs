using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArcLayoutSentinel.Services
{
    public class ArchivalService
    {
        /// <summary>
        /// Generates the full UNC destination path based on the Year/Month/Day/Category hierarchy.
        /// </summary>
        public static string GenerateDestinationFolder(string rootPath, string category)
        {
            var now = DateTime.Now;
            string year = now.Year.ToString();
            string month = now.ToString("MMMM"); // e.g., "April"
            string day = now.Day.ToString("00");

            string folderPath = Path.Combine(rootPath, year, month, day, category);
            
            // Ensure directory exists
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            return folderPath;
        }

        /// <summary>
        /// Generates the filename according to the convention: {UniqueID}_{ClientCode}_{ProjectCode}_{YYYYMMDD}.{ext}
        /// </summary>
        public static string GenerateFileName(string uniqueId, string clientCode, string projectCode, string extension)
        {
            string datePart = DateTime.Now.ToString("yyyyMMdd");
            // Sanitize inputs
            string cleanClient = SanitizePath(clientCode);
            string cleanProject = SanitizePath(projectCode);

            return $"{uniqueId}_{cleanClient}_{cleanProject}_{datePart}.{extension.TrimStart('.')}";
        }

        private static string SanitizePath(string input)
        {
            foreach (char c in Path.GetInvalidFileNameChars())
            {
                input = input.Replace(c, '_');
            }
            return input.Replace(" ", "_");
        }
    }
}
