namespace IoCManager.Mvc.Models
{
    public class Sweeper
    {

        //data fields
        int sweeperID { get; set; }
        string name { get; set; }
        string mode { get; set; }
        DateTime lastSweep { get; set; }
        
        //methods
        public void sweepTarget(Target target) { 
           }
        public void sweepNetwork(Network network) {
        
        }
        public bool matchIOC(IOC ioc) { 
            return false; 
          }
        public Report generateSweeperReport() {
            
           return new Report(); 
        }



        // Relationship
        public ScanPlan scanPlan { get; set; }

    }

}
