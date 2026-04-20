using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Tocly.Controllers
{
    public class TablesController : Controller
    {
        // GET: Tables
        public ActionResult BasicTables()
        {
            return View();
        }
        public ActionResult DataTables()
        {
            return View();
        }
        public ActionResult Editable()
        {
            return View();
        }
    }
}