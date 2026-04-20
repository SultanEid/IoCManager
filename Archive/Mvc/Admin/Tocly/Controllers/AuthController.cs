using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Tocly.Controllers
{
    public class AuthController : Controller
    {
        // GET: Auth
        public ActionResult Lockscreen()
        {
            return View();
        }
        public ActionResult Login()
        {
            return View();
        }
        public ActionResult Recoverpw()
        {
            return View();
        }
        public ActionResult Register()
        {
            return View();
        }
    }
}