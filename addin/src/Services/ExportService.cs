using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ArcGIS.Desktop.Framework.Threading.Tasks;
using ArcGIS.Desktop.Layouts;
using ArcGIS.Desktop.Mapping;

namespace ArcLayoutSentinel.Services
{
    public class ExportService
    {
        /// <summary>
        /// Exports the specified layout to a file at the given path (PDF or JPEG).
        /// Returns true only if the file was successfully created.
        /// </summary>
        public static async Task<(bool success, string error)> ExportLayoutAsync(string layoutName, string outputPath, string format)
        {
            return await QueuedTask.Run(() =>
            {
                try
                {
                    var layoutItem = ArcGIS.Desktop.Core.Project.Current.GetItems<LayoutProjectItem>()
                        .FirstOrDefault(l => l.Name == layoutName);

                    if (layoutItem == null) return (false, $"Layout '{layoutName}' not found in the current project.");

                    var layout = layoutItem.GetLayout();

                    if (format.Equals("PDF", StringComparison.OrdinalIgnoreCase))
                    {
                        PDFFormat pdf = new PDFFormat()
                        {
                            OutputFileName = outputPath,
                            Resolution = 300,
                            DoCompressVectorGraphics = true,
                            DoEmbedFonts = true
                        };
                        if (!pdf.ValidateOutputFilePath())
                            return (false, $"Invalid output path for PDF: {outputPath}");

                        layout.Export(pdf);
                        if (!File.Exists(outputPath))
                            return (false, "Export completed but file was not created on disk.");

                        return (true, null);
                    }
                    else if (format.Equals("JPEG", StringComparison.OrdinalIgnoreCase) || format.Equals("JPG", StringComparison.OrdinalIgnoreCase))
                    {
                        JPEGFormat jpeg = new JPEGFormat()
                        {
                            OutputFileName = outputPath,
                            Resolution = 300,
                            HasWorldFile = false
                        };
                        if (!jpeg.ValidateOutputFilePath())
                            return (false, $"Invalid output path for JPEG: {outputPath}");

                        layout.Export(jpeg);
                        if (!File.Exists(outputPath))
                            return (false, "Export completed but file was not created on disk.");

                        return (true, null);
                    }

                    return (false, $"Unsupported export format: {format}");
                }
                catch (Exception ex)
                {
                    return (false, $"Export failed: {ex.Message}");
                }
            });
        }
    }
}
