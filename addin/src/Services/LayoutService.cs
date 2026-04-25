using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Threading.Tasks;
using ArcGIS.Desktop.Layouts;
using ArcGIS.Desktop.Core;

namespace ArcLayoutSentinel.Services
{
    public class LayoutService
    {
        /// <summary>
        /// Retrieves a list of layout names that are currently open in the active project.
        /// Must be called from the UI thread or handled via QueuedTask.
        /// </summary>
        public static async Task<List<string>> GetOpenLayoutNamesAsync()
        {
            return await QueuedTask.Run(() =>
            {
                // 1. Get all layout items in the project
                var layoutItems = Project.Current.GetItems<LayoutProjectItem>();
                
                // 2. Filter for those that are actually "open" (have an active or inactive view)
                // Note: In ArcGIS Pro SDK, we check for LayoutViews
                var openLayouts = FrameworkApplication.Panes
                    .OfType<ILayoutPane>()
                    .Select(pane => pane.LayoutView.Layout.Name)
                    .Distinct()
                    .ToList();

                return openLayouts;
            });
        }
    }
}
