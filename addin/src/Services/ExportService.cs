using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ArcGIS.Desktop.Framework.Threading.Tasks;
using ArcGIS.Desktop.Layouts;
using ArcGIS.Desktop.Mapping;

namespace ArcLayoutSentinel.Services
{
    public class ExportService
    {
        public static async Task<(bool success, string error)> ExportLayoutAsync(string layoutName, string outputPath, string format)
        {
            return await QueuedTask.Run(() =>
            {
                try
                {
                    var layoutItem = ArcGIS.Desktop.Core.Project.Current.GetItems<LayoutProjectItem>().FirstOrDefault(l => l.Name == layoutName);
                    if (layoutItem == null) return (false, $"Layout '{layoutName}' not found.");

                    var layout = layoutItem.GetLayout();

                    if (format.Equals("PDF", StringComparison.OrdinalIgnoreCase))
                    {
                        PDFFormat pdf = new PDFFormat { OutputFileName = outputPath, Resolution = 300, DoCompressVectorGraphics = true, DoEmbedFonts = true };
                        layout.Export(pdf);
                        return (File.Exists(outputPath), !File.Exists(outputPath) ? "Export completed but file not created." : null);
                    }
                    else
                    {
                        JPEGFormat jpeg = new JPEGFormat { OutputFileName = outputPath, Resolution = 300, HasWorldFile = false };
                        layout.Export(jpeg);
                        return (File.Exists(outputPath), !File.Exists(outputPath) ? "Export completed but file not created." : null);
                    }
                }
                catch (Exception ex) { return (false, $"Export failed: {ex.Message}"); }
            });
        }
    }
}