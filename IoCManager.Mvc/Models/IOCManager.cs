using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace IoCManager.Mvc.Models
{
    public class IOCManager
    {

        public int ManagerID ;
        public string name;
        public DateTime DashboardLastUpdated;



        // methods
        public List<IOCFile> LoadIOCFiles(string directoryPath)
        {
            if (string.IsNullOrWhiteSpace(directoryPath))
                throw new ArgumentException("directoryPath is required.", nameof(directoryPath));

            if (!Directory.Exists(directoryPath))
                return new List<IOCFile>();

            var files = Directory.GetFiles(directoryPath);

            var result = files.Select(path =>
            {
                var info = new FileInfo(path);

                return new IOCFile
                {

                    FileName = info.Name,
                    FilePath = info.FullName,
                    Size = info.Length,
                    FileType = info.Extension,
                    ImportedAt = DateTime.UtcNow,
                    FormatValid = true
                };
            }).ToList();

            DashboardLastUpdated = DateTime.UtcNow;
            return result;
        } 



        public void registerTarget() 
        { 
        
        }
        public void registerNetwork() {
        
        }
        public void createScanPlan() {
        
        }
        public void runScanPlan() {
        
        }
        public void addIOC() { 
        
        }
        public void updateDashboard() { 
        
        }
        public void generateReport() { 
        
        }
        public void assignScanner() { 
        
        }
        public void scheduleScan() { 
        
        }

        // relationships
        public List<Scanner> scanners { get; set; } = new();
        public List<Sweeper> sweepers { get; set; } = new();
        public List<Scheduler> schedulers { get; set; } = new();
        public List<Network> networks { get; set; } = new();


    }
}
