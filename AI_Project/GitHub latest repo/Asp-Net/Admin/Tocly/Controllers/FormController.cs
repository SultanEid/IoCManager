using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class FormController : Controller
    {
        // GET: Form
        public IActionResult Editor()
        {
            return View();
        }
        public IActionResult Elements()
        {
            return View();
        }
        public IActionResult FileUpload()
        {
            return View();
        }
        public IActionResult plugins()
        {
            return View();
        }
        public IActionResult Validation()
        {
            return View();
        }
        public IActionResult Wizard()
        {
            return View();
        }
    }
}