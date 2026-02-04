using System.Data;

namespace IoCManager.Mvc.Models
{
    public class IOC
    {

        //data fields
        int iocID { get; set; }
        string value { get; set; }
        string type { get; set; }
        string severity { get; set; }
        string source { get; set; }
        DateTime createdAt { get; set; }
        DateTime lastUpdated { get; set; }


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
