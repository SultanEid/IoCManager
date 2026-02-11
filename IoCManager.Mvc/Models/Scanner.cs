using System;
using IoCManagerProject;

namespace IoCManager.Mvc.Models
{
    public class Scanner
    {
        //data fields
        public int scannerID { get; set; }
        public string name { get; set; }
        public string engineType { get; set; }
        public string version { get; set; }
        public string status { get; set; }
        DateTime lastRun { get; set; }
        public string config { get; set; }

        //// Save the latest survey outputs (simple for now) and later save them in the database
        private readonly List<(Target target, string details, DateTime scannedAt)> _scanResults = new();
        private readonly List<(IOC ioc, Target target, DateTime matchedAt)> _iocMatches = new();

        // last report (so getScanResult() has something to expose)
        public Report lastReport { get; private set; }


        //--------------------------------------------------------------------
        //--------------------------------------------------------------------


        // methods
        public void loadScanEngine()
        {
            // Placeholder: later we can actually load/initialize an engine
            status = "Ready";
        }

        //--------------------------------------------------------------------


        public void setScanConfiguration(string config)
        {
            this.config = string.IsNullOrWhiteSpace(config) ? string.Empty : config.Trim();
        }

        //--------------------------------------------------------------------


        public void runScan(Target target)
        {
            if (target == null)
                return;

            // ensure engine is ready
            if (status == "Idle")
                loadScanEngine();

            status = "Running";
            var now = DateTime.UtcNow;

            // collect details (what we "scan" for now)
            var details = target.getDetails();

            // update target metadata
            target.updateLastScanTime(now);

            // store/update results for this target
            _scanResults.RemoveAll(r => r.target != null && r.target.TargetID == target.TargetID);
            _scanResults.Add((target, details ?? string.Empty, now));

            lastRun = now;
            status = "Completed";
        }

        //--------------------------------------------------------------------

        public void scanForIOC(IOC ioc)
        {
            if (ioc == null)
                return;

            if (!ioc.ValidateIOC())
                return;

            if (_scanResults.Count == 0)
                return;

            var now = DateTime.UtcNow;

            foreach (var r in _scanResults)
            {
                if (r.target == null)
                    continue;

                if (string.IsNullOrWhiteSpace(r.details))
                    continue;

                if (ioc.Match(r.details))
                {
                    // avoid duplicates: same ioc on same target
                    bool exists = _iocMatches.Any(m =>
                        m.ioc != null && m.target != null &&
                        m.ioc.IocID == ioc.IocID &&
                        m.target.TargetID == r.target.TargetID);

                    if (!exists)
                        _iocMatches.Add((ioc, r.target, now));
                }
            }
        }

        //--------------------------------------------------------------------

        public void stopScan()
        {
            // Placeholder: later can cancel a running scan
            status = "Stopped";
        }
        //--------------------------------------------------------------------

        public void getScanResult()
        {
            // Build a simple report into lastReport (same pattern as Sweeper)
            var report = new Report
            {
                title = "Scanner Report",
                format = "Summary",
                createdAt = DateTime.UtcNow
            };

            if (_scanResults.Count == 0)
            {
                report.summary = "No scan results available yet.";
                report.severityStats = "Matches: 0";
                lastReport = report;
                return;
            }

            var matchesCount = _iocMatches.Count;

            report.severityStats = $"Matches: {matchesCount}";
            report.summary =
                "Scan Results:\n" +
                string.Join("\n", _scanResults
                    .OrderByDescending(r => r.scannedAt)
                    .Select(r => $"[{r.scannedAt:O}] {r.target?.Name ?? "N/A"}"));

            if (matchesCount > 0)
            {
                report.summary += "\n\nIOC Matches:\n" +
                    string.Join("\n", _iocMatches
                        .OrderByDescending(m => m.matchedAt)
                        .Select(m => $"[{m.matchedAt:O}] IOC#{m.ioc?.IocID} matched on Target={m.target?.Name ?? "N/A"}"));
            }

            // attach to plan if assigned
            if (scanPlan != null)
                scanPlan.addReport(report);

            lastReport = report;
        }


        //--------------------------------------------------------------------
        //--------------------------------------------------------------------


        // relationship
        public ScanPlan scanPlan { get; set; }
    }
}
