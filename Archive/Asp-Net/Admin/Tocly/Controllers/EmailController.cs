using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class EmailController : Controller
    {
        // GET: Email
        public IActionResult Inbox()
        {
            return View();
        }
        public IActionResult Read()
        {
            return View();
        }
    }
}