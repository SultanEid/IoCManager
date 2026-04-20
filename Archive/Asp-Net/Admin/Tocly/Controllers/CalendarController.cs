using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class CalendarController : Controller
    {
        // GET: Calendar
        public IActionResult Index()
        {
            return View();
        }
    }
}