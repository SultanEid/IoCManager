using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class IconsController : Controller
    {
        // GET: Icons
        public IActionResult materialdesign()
        {
            return View();
        }
        public IActionResult remix()
        {
            return View();
        }
        public IActionResult unicons()
        {
            return View();
        }
    }
}