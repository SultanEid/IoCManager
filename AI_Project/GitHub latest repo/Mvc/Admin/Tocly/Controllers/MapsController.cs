using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Tocly.Controllers
{
    public class MapsController : Controller
    {
        // GET: Maps
        public ActionResult Google()
        {
            return View();
        }
        public ActionResult Vector()
        {
            return View();
        }
    }
}