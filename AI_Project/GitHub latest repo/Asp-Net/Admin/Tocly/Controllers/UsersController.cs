using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class UsersController : Controller
    {
        // GET: Users
        public IActionResult detail()
        {
            return View();
        }
        public IActionResult List()
        {
            return View();
        }
    }
}