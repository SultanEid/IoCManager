using System;
using System.Collections.Generic;
using System.Linq;

namespace IoCManagerProject
{
    public class Report
    {
        // Private Attributes as per System Design
        private int reportID;
        private string title;
        private string format;
        private DateTime createdAt;
        private string summary;
        private string severityStats;

        // Functional Storage for raw results
        private List<string> findingsList = new List<string>();
        private Dictionary<string, int> statsCounter = new Dictionary<string, int>
        {
            { "CRITICAL", 0 }, { "HIGH", 0 }, { "MEDIUM", 0 }, { "LOW", 0 }
        };

        public Report(int id, string title)
        {
            this.reportID = id;
            this.title = title;
            this.createdAt = DateTime.Now;
            this.format = "Initial";
            this.summary = "Pending Generation";
        }

        // +addScanResult(result): Appends finding and updates stats dynamically
        public void AddScanResult(string severity, string message)
        {
            string formattedSeverity = severity.ToUpper();
            if (statsCounter.ContainsKey(formattedSeverity))
            {
                statsCounter[formattedSeverity]++;
                findingsList.Add($"[{formattedSeverity}] {message}");
                Console.WriteLine($"[REPORT DATA]: Added result with severity: {formattedSeverity}");
            }
        }

        // +generate(): Processes the raw findings into a structured summary
        public void Generate()
        {
            if (findingsList.Count == 0)
            {
                this.summary = "Scan completed. No threats were identified.";
                this.severityStats = "All systems clear.";
            }
            else
            {
                this.summary = $"Scan completed. Total of {findingsList.Count} threats detected.";
                this.severityStats = string.Join(", ", statsCounter.Select(x => $"{x.Key}: {x.Value}"));
            }

            this.format = "Ready";
            Console.WriteLine($"[REPORT]: Processing complete for ID {reportID}. Summary generated.");
        }

        // +exportPDF(): Simulates a functional PDF export
        public void ExportPDF()
        {
            this.format = "PDF";
            Console.WriteLine("\n--- GENERATING PDF DOCUMENT ---");
            Console.WriteLine($"Output: Report_{reportID}_{DateTime.Now:yyyyMMdd}.pdf");
            Console.WriteLine($"Title: {title}");
            Console.WriteLine($"Content: {summary}");
            Console.WriteLine($"Stats: {severityStats}");
            Console.WriteLine("--- PDF EXPORT SUCCESSFUL ---\n");
        }

        // +exportJSON(): Returns a functional JSON-like string (Functional for data exchange)
        public void ExportJSON()
        {
            this.format = "JSON";
            string json = $@"{{
                ""reportID"": {reportID},
                ""title"": ""{title}"",
                ""timestamp"": ""{createdAt}"",
                ""stats"": {{ ""Critical"": {statsCounter["CRITICAL"]}, ""High"": {statsCounter["HIGH"]} }},
                ""findings"": {findingsList.Count}
            }}";

            Console.WriteLine("[EXPORT]: Exporting as JSON string...");
            Console.WriteLine(json);
        }

        // +attachToPlan(scanPlan): Links report to operational plan
        public void AttachToPlan(ScanPlan scanPlan)
        {
            if (scanPlan != null)
            {
                Console.WriteLine($"[TRACEABILITY]: Linking Report {reportID} to operational configuration: {scanPlan.Name}");
            }
        }

        // +displayReport(): Renders the formatted data for the analyst dashboard
        public void DisplayReport()
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("\n**************************************************");
            Console.WriteLine($"DASHBOARD VIEW: {title}");
            Console.WriteLine($"ID: {reportID} | Generated: {createdAt}");
            Console.WriteLine("**************************************************");
            Console.ResetColor();

            Console.WriteLine($"Summary: {summary}");
            Console.WriteLine($"Threat Distribution: {severityStats}");
            Console.WriteLine("\nDetailed Findings Log:");

            if (findingsList.Count == 0) Console.WriteLine("- No findings to display.");

            foreach (var item in findingsList)
            {
                if (item.Contains("CRITICAL")) Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(item);
                Console.ResetColor();
            }
            Console.WriteLine("**************************************************\n");
        }
    }
}