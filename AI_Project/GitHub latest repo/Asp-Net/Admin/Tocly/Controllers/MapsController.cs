using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class MapsController : Controller
    {
        // GET: Maps
        public IActionResult Google()
        {
            return View();
        }
        public IActionResult Vector()
        {
            return View();
        }
    }
}