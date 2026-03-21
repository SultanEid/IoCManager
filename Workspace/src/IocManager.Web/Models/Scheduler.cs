using System;
using System.Collections.Generic;
using System.Linq;
using IoCManagerProject;

namespace IoCManager.Mvc.Models
{
    public class Scheduler
    {
        //data fields
        public int schedulerID { get; set; }
        public string name { get; set; } = string.Empty;
        public string timezone { get; set; } = "Asia/Riyadh";

        // In-memory schedule entries
        private readonly List<ScheduleEntry> _entries = new();

        //methods
        public void scheduleScan(ScanPlan scanPlan)
        {
            if (scanPlan == null) return;

            var when = resolvePlanTime(scanPlan);

            // avoid duplicates for same plan at same time
            bool exists = _entries.Any(e => e.scanPlan == scanPlan && e.scheduledAt == when && e.isCancelled == false);
            if (exists) return;

            _entries.Add(new ScheduleEntry
            {
                id = nextId(),
                scanPlan = scanPlan,
                scheduledAt = when,
                isCancelled = false
            });
        }

        public void cancelSchedule(int id)
        {
            var entry = _entries.FirstOrDefault(e => e.id == id);
            if (entry == null) return;

            entry.isCancelled = true;
        }

        public void updateSchedule(int id, DateTime newTime)
        {
            var entry = _entries.FirstOrDefault(e => e.id == id);
            if (entry == null) return;

            entry.scheduledAt = newTime;
            entry.isCancelled = false;
        }

        public void triggerScan()
        {
            var now = DateTime.UtcNow;

            var due = _entries
                .Where(e => !e.isCancelled && !e.hasExecuted && e.scheduledAt <= now)
                .OrderBy(e => e.scheduledAt)
                .ToList();

            foreach (var entry in due)
            {
                if (entry.scanPlan == null)
                    continue;

                entry.scanPlan.ExecutePlan(); 
                entry.hasExecuted = true;
            }
        }


        public List<ScanPlan> getScheduleList()
        {
            // return scheduled plans that are not cancelled
            return _entries
                .Where(e => !e.isCancelled && e.scanPlan != null)
                .OrderBy(e => e.scheduledAt)
                .Select(e => e.scanPlan)
                .Distinct()
                .ToList();
        }

        // helpers
        private int nextId()
        {
            return _entries.Count == 0 ? 1 : _entries.Max(e => e.id) + 1;
        }

        // Best-effort: get scheduled time from ScanPlan if it has a date/time,
        // otherwise schedule immediately.
        private DateTime resolvePlanTime(ScanPlan scanPlan)
        {
            return scanPlan?.ScheduledTime ?? DateTime.UtcNow;
        }


        // inner type (simple schedule record)
        private class ScheduleEntry
        {
            public int id { get; set; }
            public ScanPlan scanPlan { get; set; }
            public DateTime scheduledAt { get; set; }
            public bool isCancelled { get; set; }
            public bool hasExecuted { get; set; }
        }
    }
}
