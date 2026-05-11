using System;

namespace ArcLayoutSentinel.Models
{
    public class MapInfo
    {
        public int MapId { get; set; }
        public string UniqueId { get; set; }
        public string LayoutName { get; set; }
        public string ProjectPath { get; set; }
        public string ProjectName { get; set; }
        public string Category { get; set; }
        public string IncomeNum { get; set; }
        public string OutcomeNum { get; set; }
        public string ToWhom { get; set; }
        public string Status { get; set; }
        public string Comment { get; set; }
        public string FilePath { get; set; }
        public int AnalystId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
