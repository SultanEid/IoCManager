namespace IoCManager.Mvc.Models
{
    public class IOCManager
    {

         int managerID { get; set; }
         string name { get; set; }
         DateTime dashboardLastUpdated { get; set; }

      

        // methods
        public void loadIOCFiles() {
        
        }
        public void registerTarget() { 
        
        }
        public void registerNetwork() {
        
        }
        public void createScanPlan() {
        
        }
        public void runScanPlan() {
        
        }
        public void addIOC() { 
        
        }
        public void updateDashboard() { 
        
        }
        public void generateReport() { 
        
        }
        public void assignScanner() { 
        
        }
        public void scheduleScan() { 
        
        }

        // relationships
        public List<Scanner> scanners { get; set; } = new();
        public List<Sweeper> sweepers { get; set; } = new();
        public List<Scheduler> schedulers { get; set; } = new();
        public List<Network> networks { get; set; } = new();


    }
}
