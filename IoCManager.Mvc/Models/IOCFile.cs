namespace IoCManager.Mvc.Models
{
    public class IOCFile
    {
        //data fields
        string fileName { get; set; }
        string filePath { get; set; }
        long size { get; set; }
        string fileType { get; set; }
        DateTime importedAt { get; set; }
        bool formatValid { get; set; }

        //methods
        public void parseFile() {
          }
        public string getFileMetadata() { 
            return ""; 
          }
        public bool validateFormat() { 
            return true; 
          }
        public void importIOC() { 
          }
        public void exportIOC() { 

          }
    }
}
