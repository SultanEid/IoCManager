using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class TablesController : Controller
    {
        // GET: Tables
        public IActionResult BasicTables()
        {
            return View();
        }
        public IActionResult DataTables()
        {
            return View();
        }
        public IActionResult Editable()
        {
            return View();
        }
    }
}