using IoCManager.Mvc.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace IoCManagerProject
{
    public class ScanPlan
    {
        // Attributes from the updated Class Diagram
        public int PlanID { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ScheduledTime { get; set; }
        public string Description { get; set; }

        // Composition & Aggregation based on ERD/Class Diagram
        private List<IOCFile> linkedFiles = new List<IOCFile>();
        private List<Report> generatedReports = new List<Report>();
        private List<Target> targets = new List<Target>();

        // Relationships with other control classes
        public Scanner AssignedScanner { get; private set; }
        public Sweeper AssignedSweeper { get; private set; }
        public Scheduler AssignedScheduler { get; private set; }

        public ScanPlan(int id, string name, string description)
        {
            PlanID = id;
            Name = name;
            Description = description;
            Status = "Draft";
            CreatedAt = DateTime.Now;
            Console.WriteLine($"[PLAN]: New plan '{Name}' created.");
        }

        // +addIOCFile(file: IOCFile): Integration with IOCFile class
        public void AddIOCFile(IOCFile file)
        {
            if (file != null && file.ValidateFormat())
            {
                linkedFiles.Add(file);
                Console.WriteLine($"[PLAN]: File '{file.GetFileMetadata()}' linked to plan.");
            }
        }

        // +addReport(report: Report): Integration with Report class
        public void AddReport(Report report)
        {
            generatedReports.Add(report);
            Console.WriteLine($"[PLAN]: New report record added to plan history.");
        }

        // +assignScanner(scanner: Scanner): Linking the detection engine
        public void AssignScanner(Scanner scanner)
        {
            this.AssignedScanner = scanner;
            Console.WriteLine($"[PLAN]: Scanner '{scanner.Name}' assigned to this plan.");
        }

        // +assignSweeper(sweeper: Sweeper)
        public void AssignSweeper(Sweeper sweeper)
        {
            this.AssignedSweeper = sweeper;
            Console.WriteLine($"[PLAN]: Sweeper assigned for network discovery.");
        }

        // +assignScheduler(scheduler: Scheduler)
        public void AssignScheduler(Scheduler scheduler)
        {
            this.AssignedScheduler = scheduler;
            Console.WriteLine($"[PLAN]: Execution scheduled via Scheduler system.");
        }

        // +validatePlan(): bool
        public bool ValidatePlan()
        {
            Console.WriteLine($"[VALIDATION]: Checking plan '{Name}' readiness...");

            // Logic: Plan must have at least one IoC file and an assigned Scanner
            bool isValid = linkedFiles.Count > 0 && AssignedScanner != null;

            if (isValid) Status = "Ready";
            return isValid;
        }

        // +executePlan(): Integration logic bridging all classes
        public void ExecutePlan()
        {
            if (!ValidatePlan())
            {
                Console.WriteLine("[ERROR]: Execution failed. Plan is not valid.");
                return;
            }

            this.Status = "Running";
            Console.WriteLine($"[EXECUTION]: Plan '{Name}' is now EXECUTING...");

            // 1. Gather all IOCs from linked files
            List<IOC> allIocs = new List<IOC>();
            foreach (var file in linkedFiles)
            {
                allIocs.AddRange(file.ImportIOC());
            }

            // 2. Trigger Scanner to run against Targets using the gathered IOCs
            // (Note: In a real system, we would iterate through a target list)
            Console.WriteLine($"[PROCESS]: Scanning with {AssignedScanner.Name} using {allIocs.Count} IoCs.");

            this.Status = "Completed";
            this.GenerateReports();
        }

        // +generateReports(): List<Report>
        public List<Report> GenerateReports()
        {
            Console.WriteLine($"[REPORTING]: Generating final reports for plan {Name}...");

            // Creating a new report object to be integrated later
            Report finalReport = new Report(this.PlanID, $"Report for {this.Name}");
            this.AddReport(finalReport);

            return generatedReports;
        }
    }
}