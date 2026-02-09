using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using IoCManagerProject;


namespace IoCManager.Mvc.Models
{
    public class IOCManager
    {

        public int ManagerID ;
        public string name;
        public DateTime DashboardLastUpdated;
        public List<ScanPlan> scanPlans { get; set; } = new();
        public List<IOC> iocs { get; set; } = new();




        // methods
        public List<IoCManager.Mvc.Models.IOCFile> LoadIOCFiles(string directoryPath)
        {
            if (string.IsNullOrWhiteSpace(directoryPath))
                throw new ArgumentException("directoryPath is required.", nameof(directoryPath));

            if (!Directory.Exists(directoryPath))
                return new List<IOCFile>();

            var files = Directory.GetFiles(directoryPath);

            var result = files.Select(static path =>
            {
                var info = new FileInfo(path);

                // Pass 'path' to the IOCFile constructor as required
                var iocFile = new IOCFile(path)
                {
                    FileName = info.Name,
                    FilePath = info.FullName,
                    Size = info.Length,
                    FileType = info.Extension,
                    ImportedAt = DateTime.UtcNow,
                    FormatValid = true
                };
                return iocFile;
            }).ToList();

            DashboardLastUpdated = DateTime.UtcNow;
            return result;
        }




        public bool registerTarget(Target target ,int? networkID = null) 
        {

            if (target == null)
                return false;

            if (!target.validateTarget())
                return false;

            if(target.TargetID==0)
                target.TargetID = NextTargetId();

            // Find network (or create Unassigned)
            var net = (networkID.HasValue)
                ? networks.FirstOrDefault(n => n.networkID == networkID.Value)
                : null;


            if (net == null)
                net = EnsureUnassignedNetwork();

            // Duplicate check by TargetID inside that network
            if (net.targets.Any(t => t.TargetID == target.TargetID))
                return false;

            // Duplicate check by IP overlap across ALL networks
            var incomingIps = (target.ipAddresses ?? new List<string>())
                .Where(ip => !string.IsNullOrWhiteSpace(ip))
                .Select(ip => ip.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (incomingIps.Count > 0)
            {
                var allExistingTargets = networks.SelectMany(n => n.targets).Where(t => t != null).ToList();

                foreach (var existing in allExistingTargets)
                {
                    var existingIps = (existing.ipAddresses ?? new List<string>())
                        .Where(ip => !string.IsNullOrWhiteSpace(ip))
                        .Select(ip => ip.Trim());

                    if (existingIps.Any(ip => incomingIps.Contains(ip)))
                        return false; // نفس IP موجود قبل
                }
            }

            // Attach
            net.addTarget(target);

            DashboardLastUpdated = DateTime.UtcNow;
            return true;
        }

        private int NextTargetId()
        {
            var allTargets = networks.SelectMany(n => n.targets).Where(t => t != null).ToList();
            if (allTargets.Count == 0)
                return 1;
            return allTargets.Max(t => t.TargetID) + 1;
        }


        private Network EnsureUnassignedNetwork()
        {
            var unassigned = networks.FirstOrDefault(n => n.networkID == 1 && (n.Name ?? "") == "Unassigned");
            if (unassigned != null)
                return unassigned;

            unassigned = new Network
            {
                networkID = (networks.Any() ? NextNetworkId() : 1),
                Name = "Unassigned",
                cidrRange = "",
                description = "Auto-created network for targets not assigned to a specific network."
            };

            networks.Add(unassigned);
            return unassigned;
        }
        private int NextNetworkId()
        {
            if (networks == null || networks.Count == 0)
                return 1;
            return networks.Max(n => n.networkID) + 1;
        }

        public bool registerNetwork(Network network) {
            
            if (network == null)
                return false;


            //Basic validation
            if (string .IsNullOrWhiteSpace(network.Name) & string.IsNullOrWhiteSpace(network.cidrRange))
                return false;


            // Assign ID if not provided
            if (network.networkID == 0)
                network.networkID = NextNetworkId();


            if (networks.Any(n => n.networkID == network.networkID))
                return false; // Duplicate by ID
            

            var nameNorm = (network.Name ?? "").Trim().ToLowerInvariant();
            var cidrNorm = (network.cidrRange ?? "").Trim().ToLowerInvariant();

            if (networks.Any(n =>
                ((n.Name ?? "").Trim().ToLowerInvariant() == nameNorm) &&
                ((n.cidrRange ?? "").Trim().ToLowerInvariant() == cidrNorm) &&
                (!string.IsNullOrWhiteSpace(nameNorm) || !string.IsNullOrWhiteSpace(cidrNorm))))
            {
                return false;
            }


            networks.Add(network);
            DashboardLastUpdated = DateTime.UtcNow;
            return true;

        }


        public ScanPlan createScanPlan(Scanner? scanner = null, Sweeper? sweeper = null, Scheduler? scheduler = null) {
        

            var plan = new ScanPlan();

            if (scanner != null)
                plan.assignScanner(scanner);
            if (sweeper != null)
                plan.assignSweeper(sweeper);
            if (scheduler != null)
                plan.assignScheduler(scheduler);


            scanPlans.Add(plan);
            DashboardLastUpdated = DateTime.UtcNow;

            return plan;


        }
        public Report? runScanPlan(ScanPlan plan, Network network) {
           
            if (plan == null || network == null)
                return null;

            if (!plan.validatePlan())
                return null;

            if (plan.sweeper == null)
                return null;

            //main execution
            plan.sweeper.sweepNetwork(network);
            // generate report "intrgeation with Report class"
            var report = plan.sweeper.generateSweeperReport();
            plan.addReport(report);

            DashboardLastUpdated = DateTime.UtcNow;
            return report;

        }
        public bool addIOC(IOC ioc)
        {
            if (ioc == null)
                return false;

            if (!ioc.ValidateIOC())
                return false;

            if (iocs.Any(x => x.IocID == ioc.IocID && ioc.IocID != 0))
                return false;

            var v = (ioc.Value ?? "").Trim();
            var t = (ioc.Type ?? "").Trim();

            if (!string.IsNullOrWhiteSpace(v) && !string.IsNullOrWhiteSpace(t))
            {
                if (iocs.Any(x =>
                    string.Equals((x.Value ?? "").Trim(), v, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals((x.Type ?? "").Trim(), t, StringComparison.OrdinalIgnoreCase)))
                    return false;
            }

            iocs.Add(ioc);
            DashboardLastUpdated = DateTime.UtcNow;
            return true;
        }






        public void updateDashboard() {
            DashboardLastUpdated = DateTime.UtcNow;


        }
        public Report generateReport(ScanPlan plan)
        {
            var report = new Report
            {
                title = "ScanPlan Report",
                format = "Summary",
                createdAt = DateTime.UtcNow
            };

            if (plan == null || plan.reports == null || plan.reports.Count == 0)
            {
                report.summary = "No reports found for this plan yet.";
                report.severityStats = "N/A";
                return report;


            }
            report.summary = string.Join("\n---\n",
             plan.reports
                 .Where(r => r != null)
                 .OrderByDescending(r => r.createdAt)
                 .Select(r => $"{r.title}\n{r.summary}\n{r.severityStats}")
         );

            report.severityStats = $"Total Reports: {plan.reports.Count}";
            return report;
        }


        public bool scheduleScan(ScanPlan plan, Scheduler scheduler) {
            if (plan == null || scheduler == null)
                return false;

            plan.assignScheduler(scheduler);

            //now is Empty because we don't have real scheduling logic, but in a real implementation, this would interact with a background job system or OS scheduler to run the scan at the specified time.
            scheduler.scheduleScan(plan);

            DashboardLastUpdated = DateTime.UtcNow;
            return true;
        }
        

        // relationships
        public List<Scanner> scanners { get; set; } = new();
        public List<Sweeper> sweepers { get; set; } = new();
        public List<Scheduler> schedulers { get; set; } = new();
        public List<Network> networks { get; set; } = new();


    }
}
