using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Tocly.Controllers
{
    public class UsersController : Controller
    {
        // GET: Users
        public ActionResult detail()
        {
            return View();
        }
        public ActionResult List()
        {
            return View();
        }
    }
}