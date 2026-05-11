using System.Text;

namespace ArcLayoutSentinel.Models
{
    public class PreFlightResult
    {
        public bool ApiReachable { get; set; }
        public bool TokenValid { get; set; }
        public bool UncPathWritable { get; set; }
        public string ApiError { get; set; }
        public string TokenError { get; set; }
        public string UncError { get; set; }
        public bool AllPassed => ApiReachable && TokenValid && UncPathWritable;

        public string GetSummary()
        {
            if (AllPassed) return "All pre-flight checks passed.";
            var sb = new StringBuilder();
            sb.AppendLine("Pre-flight check failed:");
            if (!ApiReachable) sb.AppendLine($"  • API Unreachable: {ApiError}");
            if (!TokenValid) sb.AppendLine($"  • Token Invalid: {TokenError}");
            if (!UncPathWritable) sb.AppendLine($"  • UNC Path Error: {UncError}");
            return sb.ToString();
        }
    }
}
