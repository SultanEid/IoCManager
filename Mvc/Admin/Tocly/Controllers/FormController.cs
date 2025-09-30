using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Tocly.Controllers
{
    public class FormController : Controller
    {
        // GET: Form
        public ActionResult Editor()
        {
            return View();
        }
        public ActionResult Elements()
        {
            return View();
        }
        public ActionResult FileUpload()
        {
            return View();
        }
        public ActionResult plugins()
        {
            return View();
        }
        public ActionResult Validation()
        {
            return View();
        }
        public ActionResult Wizard()
        {
            return View();
        }
    }
}