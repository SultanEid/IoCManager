using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Tocly.Controllers
{
    public class PagesController : Controller
    {
        // GET: Pages
        public ActionResult Error404()
        {
            return View();
        }
        public ActionResult Error500()
        {
            return View();
        }
        public ActionResult ComingSoon()
        {
            return View();
        }
        public ActionResult FAQs()
        {
            return View();
        }
        public ActionResult Maintenance()
        {
            return View();
        }
        public ActionResult Pricing()
        {
            return View();
        }
        public ActionResult Profile()
        {
            return View();
        }
        public ActionResult TermsConditions()
        {
            return View();
        }
    }
}