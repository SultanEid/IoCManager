namespace IoCManager.Mvc.Models
{
    public class Scanner
    {
        //data fields
        int scannerID { get; set; }
        string name { get; set; }
        string engineType { get; set; }
        string version { get; set; }
        string status { get; set; }
        DateTime lastRun { get; set; }
        string config { get; set; }


        //methods
        public void runScan(Target target) { 
        
        }
        public void scanForIOC(IOC ioc) { 
        
        }
        public void setScanConfiguration(string config) { 
        
        }
        public void loadScanEngine() { 
        
        }
        public void stopScan() { 
        
        }
        public void getScanResult() { 
        
        }

        //relationships
        public ScanPlan scanPlan { get; set; }









    }
}
