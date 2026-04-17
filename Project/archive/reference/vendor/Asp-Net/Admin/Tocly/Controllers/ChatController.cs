using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class ChatController : Controller
    {
        // GET: Chat
        public IActionResult Index()
        {
            return View();
        }
    }
}