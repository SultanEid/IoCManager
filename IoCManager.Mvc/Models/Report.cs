using System;

namespace IoCManager.Mvc.Models
{
    public class Report
    {
        //  data fields

        public int reportID { get; set; }
        public string title { get; set; }
        public string format { get; set; }
        public DateTime createdAt { get; set; }
        public string summary { get; set; }
        public string severityStats { get; set; }

        // methods
        public void generate() { }
        public void addScanResult(object result) { }
        public void exportPDF() { }
        public void exportJSON() { }
        public void attachToPlan(ScanPlan scanPlan) { }
        public void displayReport() { }
    }
}
