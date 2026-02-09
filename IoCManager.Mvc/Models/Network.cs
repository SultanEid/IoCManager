using System.Collections.Generic;
using System.Linq;

namespace IoCManager.Mvc.Models
{
    public class Network
    {
        //data fields 
        public int networkID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string cidrRange { get; set; } = string.Empty;
        public string description { get; set; } = string.Empty;

        public List<Target> targets { get; set; } = new();

        //methods
        public void addTarget(Target target)
        {
            if (target == null) return;

            if (targets.Any(t => t != null && t.TargetID == target.TargetID))
                return;

            targets.Add(target);
        }

        public void removeTarget(Target target)
        {
            if (target == null || targets == null) return;

            targets.RemoveAll(t => t != null && t.TargetID == target.TargetID);
        }

        public string getNetworkMap()
        {
            return $"Network={Name}; CIDR={cidrRange}; Targets={(targets?.Count ?? 0)}";
        }

        public List<Target> getTargetList()
        {
            return targets ?? new List<Target>();
        }
    }
}
