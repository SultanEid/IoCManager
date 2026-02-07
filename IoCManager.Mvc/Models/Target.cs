using System;

namespace IoCManager.Mvc.Models
{
    public class Target
    {
        //data fields

        public int TargetID { get; set; }
        public string Name { get; set; }
        public  List<string> ipAddresses { get; set; } = new();
        public string OsType { get; set; }
        public string Status { get; set; }
        DateTime LastScanTime { get; set; }




        //method
        public bool validateTarget() {
            
            return true;
        }
        public bool ping() { 
            return true;
        
        }
        public string getDetails() { 
            var ips = (ipAddresses == null || ipAddresses.Where(ip => !string.IsNullOrWhiteSpace(ip)).Count() == 0) ? "No IPs" : string.Join(", ", ipAddresses.Where(ip => !string.IsNullOrWhiteSpace(ip)));

            var name = string.IsNullOrWhiteSpace(Name) ? "N/A" : Name;
            var os = string.IsNullOrWhiteSpace(OsType) ? "N/A" : OsType;
            var status = string.IsNullOrWhiteSpace(Status) ? "Unknown" : Status;



            return $"Name={name}; IPs={ips}; OS={os}; Status={status}; LastScan={LastScanTime:O}";
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
