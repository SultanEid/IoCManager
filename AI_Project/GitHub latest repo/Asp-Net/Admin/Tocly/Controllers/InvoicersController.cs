using Microsoft.AspNetCore.Mvc;

namespace Tocly.Controllers
{
    public class InvoicersController : Controller
    {
        // GET: Invoicers
        public IActionResult InvoiceDetail()
        {
            return View();
        }
        public IActionResult Invoices()
        {
            return View();
        }
    }
}