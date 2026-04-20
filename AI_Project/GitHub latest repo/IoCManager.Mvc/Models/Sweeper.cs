using System;
using System.Collections.Generic;
using System.Linq;
using IoCManagerProject;

namespace IoCManager.Mvc.Models
{
    public class Sweeper
    {

        //data fields
       public int sweeperID { get; set; }
        public string Name { get; set; } = string.Empty;

        public string Mode { get; set; }
        public DateTime lastSweep { get; set; }
        private readonly List<(Target target, bool isUP, DateTime checkedAt)> _lastResults = new();
        private string details;

        //methods



        public void sweepTarget(Target target) {

            if (target == null)
                return;

            var now = DateTime.UtcNow;
            var isUp = target.ping();

            target.setStatus(isUp ? "UP" : "DOWN");
            target.updateLastScanTime(now);

            _lastResults.RemoveAll(r => ReferenceEquals(r.target, target));
            _lastResults.Add((target, isUp, now));
            
            lastSweep= now ;
        }





        public void sweepNetwork(Network network) {

            if (network == null || network.targets == null)
            { 
                 lastSweep = DateTime.UtcNow;
                 return;
            }
            
            foreach (var target  in network.targets)
               sweepTarget(target);

            
            lastSweep= DateTime.UtcNow;
            
        }
        




        public Report generateSweeperReport() {

            var report = new Report
            {
                title = "Sweeper Report",
                format = "Summary",
                createdAt = DateTime.UtcNow,
            };

            if (_lastResults.Count ==0 ) {
                report.summary = "No swept results available  yet.";
                report.severityStats = "Up: 0 | Down : 0";
                return report;
            }
            
            var upCount = _lastResults.Count(r => r.isUP);
            var downCount = _lastResults.Count - upCount;



            report.severityStats = $"Up: {upCount} | Down: {downCount}";
            report.summary = string.Join("\n", _lastResults
                .OrderByDescending(r => r.checkedAt)
                .Select(r => $"[{r.checkedAt:O}] {r.target.Name} => {(r.isUP ? "Up" : "Down")}"));

            return report;

        }
        

        public bool matchIOC(IOC ioc)
        {

            if (ioc == null)
                return false;

            if (!ioc.ValidateIOC())
                return false;

            if (_lastResults == null || _lastResults.Count == 0)
                return false;


            foreach (var r in _lastResults)
            {
                if (r.target == null)
                    continue;

                var details = r.target.getDetails();
                if (string.IsNullOrWhiteSpace(details))
                    continue;

                if (ioc.Match(details))
                    return true;
            }
        
            return false;
        }

        



        // Relationship
        public ScanPlan scanPlan { get; set; }

    }

}
