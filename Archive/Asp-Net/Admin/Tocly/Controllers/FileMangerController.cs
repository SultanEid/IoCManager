using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class FileMangerController : Controller
    {
        // GET: FileManger
        public IActionResult Index()
        {
            return View();
        }
    }
}