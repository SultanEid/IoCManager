using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class DashboardController : Controller
    {
        // GET: Dashboard
        public IActionResult Index()
        {
            return View();
        }
    }
}