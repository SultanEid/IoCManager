using System;

namespace IoCManager.Mvc.Models
{
    public class Report
    {
        //  data fields

        public int reportID;
        public string title;
        public string format;
        public DateTime createdAt;
        public string summary;
        public string severityStats;
        // methods
        public void generate() {
        }
        public void addScanResult(object result) {
        
        }
        public void exportPDF() {
        
        }
        public void exportJSON() { 
        
        }
        public void attachToPlan(ScanPlan scanPlan) { }
        public void displayReport() { }

    }
}
