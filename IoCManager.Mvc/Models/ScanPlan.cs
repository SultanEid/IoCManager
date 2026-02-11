using System;

namespace IoCManager.Mvc.Models
{
    public class ScanPlan
    {

        public int planID { get; set; }
        public string name { get; set; }
        public string status { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime scheduledTime { get; set; }
        public string description { get; set; }

        //methods

        public void addIOCFile(IOCFile file) {
        
        }
        public void addReport(Report report) {
        }
        public void assignScanner(Scanner scanner) {
        }
        public void assignSweeper(Sweeper sweeper) {
        }
        public void assignScheduler(Scheduler scheduler) { 
        }
        public void executePlan() {
        }
        public bool validatePlan() { 
            return true; }
        public List<Report> generateReports() { 
            return reports; }

        public List<Report> reports { get; set; } = new();


        //relationships
        public Scanner scanner { get; set; }
        public Sweeper sweeper { get; set; }
        public Scheduler scheduler { get; set; }


    }
}
