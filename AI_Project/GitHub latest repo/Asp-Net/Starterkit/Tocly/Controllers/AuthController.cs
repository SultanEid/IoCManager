using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class AuthController : Controller
    {
        // GET: Auth
        public IActionResult Lockscreen()
        {
            return View();
        }
        public IActionResult Login()
        {
            return View();
        }
        public IActionResult Recoverpw()
        {
            return View();
        }
        public IActionResult Register()
        {
            return View();
        }
    }
}