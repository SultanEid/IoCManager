using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class PagesController : Controller
    {
        // GET: Pages
        public IActionResult Error404()
        {
            return View();
        }
        public IActionResult Error500()
        {
            return View();
        }
        public IActionResult ComingSoon()
        {
            return View();
        }
        public IActionResult FAQs()
        {
            return View();
        }
        public IActionResult Maintenance()
        {
            return View();
        }
        public IActionResult Pricing()
        {
            return View();
        }
        public IActionResult Profile()
        {
            return View();
        }
        public IActionResult TermsConditions()
        {
            return View();
        }
    }
}