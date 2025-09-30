using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Tocly.Controllers
{
    public class InvoicersController : Controller
    {
        // GET: Invoicers
        public ActionResult InvoiceDetail()
        {
            return View();
        }
        public ActionResult Invoices()
        {
            return View();
        }
    }
}