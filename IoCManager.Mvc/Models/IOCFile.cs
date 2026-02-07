using System;

namespace IoCManager.Mvc.Models
{
    public class IOCFile
    {
        //data fields
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public long Size { get; set; }
        public string FileType { get; set; }
        public DateTime ImportedAt { get; set; }
        public bool FormatValid { get; set; }

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
