using System;

namespace IoCManager.Mvc.Models
{
    public class Target
    {
        //data fields

        public int TargetID { get; set; }
        public string Name { get; set; }   = string.Empty;
        public  List<string> ipAddresses { get; set; } = new();
        public string OsType { get; set; } = string.Empty;
        public string Status { get; set; }
        DateTime LastScanTime { get; set; } = DateTime.MinValue;




        //method
        public bool validateTarget() {
            
            bool hasName= !string.IsNullOrWhiteSpace(Name);
            bool hasIp = ipAddresses!= null && ipAddresses.Any(ip => !string.IsNullOrWhiteSpace(ip));


            return hasName || hasIp ;
        }
        public bool ping() {
            // We will actually link it later. >> Placeholder
            return validateTarget();
        
        }
        public string getDetails() {

            var cleanIps = (ipAddresses ?? new List<string>())
                 .Where(ip => !string.IsNullOrWhiteSpace(ip))
                 .Select(ip => ip.Trim())
                 .Distinct()
                 .ToList();

            var ips = cleanIps.Count == 0 ? "No IPs" : string.Join(", ", cleanIps);

            var name = string.IsNullOrWhiteSpace(Name) ? "N/A" : Name;
            var os = string.IsNullOrWhiteSpace(OsType) ? "N/A" : OsType;
            var status = string.IsNullOrWhiteSpace(Status) ? "Unknown" : Status;


            return $"Name={name}; IPs={ips}; OS={os}; Status={status}; LastScan={LastScanTime:O}";
        }


        public void addIPAddress(string ip) {

            if (string.IsNullOrWhiteSpace(ip)) return;
            
            ip = ip.Trim();
            if(ipAddresses == null) ipAddresses = new List<string>();

            if (ipAddresses.Any(x => string.Equals(x?.Trim(), ip, StringComparison.OrdinalIgnoreCase)))
                return;

            ipAddresses.Add(ip);


        }




        public void removeIPAddress(string ip) {

            if (string.IsNullOrWhiteSpace(ip) || ipAddresses == null) return;

            ip = ip.Trim();
            ipAddresses.RemoveAll(x => string.Equals(x?.Trim(), ip, StringComparison.OrdinalIgnoreCase));

        }
        public void setStatus(string status) {
            Status = string.IsNullOrWhiteSpace(status) ? "Unknown" : status.Trim();

        }
        public void updateLastScanTime(DateTime time) {
            LastScanTime = time;

        }

    }
}
