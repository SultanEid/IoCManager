namespace IoCManager.Mvc.Models
{
    public class Scheduler
    {
        //data fields
        int schedulerID { get; set; }
        string name { get; set; }
        string timezone { get; set; }

        //methods
        public void scheduleScan(ScanPlan scanPlan) {
          }
        public void cancelSchedule(int id) {
          }
        public void updateSchedule(int id, DateTime newTime) {
          }
        public void triggerScan() {
         }
        public List<ScanPlan> getScheduleList() { 
            return new();
        
        }
    }
}
