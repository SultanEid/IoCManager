namespace IoCManager.Mvc.Models
{
    public class Target
    {
        //data fields

        int targetID { get; set; }
        string name { get; set; }
        List<string> ipAddresses { get; set; } = new();
        string osType { get; set; }
        string status { get; set; }
        DateTime lastScanTime { get; set; }




        //method
        public bool validateTarget() {
            
            return true;
        }
        public bool ping() { 
            return true;
        
        }
        public string getDetails() { 
            return ""; 
        }
        public void addIPAddress(string ip) { 
           }
        public void removeIPAddress(string ip) { 
          }
        public void setStatus(string status) {  
        
         }
        public void updateLastScanTime(DateTime time) {  
          }

    }
}
