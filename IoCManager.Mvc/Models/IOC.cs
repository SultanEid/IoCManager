using System.Data;

namespace IoCManager.Mvc.Models
{
    public class IOC
    {

        //data fields
        public int iocID { get; set; }
        public string value { get; set; }
        public string type { get; set; }
        public string severity { get; set; }
        public string source { get; set; }
        public DateTime createdAt { get; set; }
        public  DateTime lastUpdated { get; set; }


        //methods
        public bool validateIOC() { 
            return true;
           }
        public string getIOCType() { 
            return type;  
        }
        public string getDetails() { 
            return ""; 
        }
        public bool match(string input) { 
            return false; 
        }
        public void updateIOC(object data) { 
        
         }

    }
}
