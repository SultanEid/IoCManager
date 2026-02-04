namespace IoCManager.Mvc.Models
{
    public class Network
    {
        //data fields
        int networkID { get; set; }
        string name { get; set; }
        string cidrRange { get; set; }
        string description { get; set; }

        public List<Target> targets { get; set; } = new();

        //methods

        public void addTarget(Target target) {
          }
        public void removeTarget(Target target) { 
        
        }
        public string getNetworkMap() { 
            return "";
        }
        public List<Target> getTargetList() { 
            return targets; 
        }



    }
}
