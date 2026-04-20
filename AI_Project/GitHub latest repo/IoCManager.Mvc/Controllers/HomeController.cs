using System.Diagnostics;
using IoCManager.Mvc.Models;
using Microsoft.AspNetCore.Mvc;

namespace IoCManager.Mvc.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }


        //the action for testing purposes only - simulates a sweep and IOC match
        public ContentResult TestMatch()
        {
            var t1 = new Target
            {
                Name = "Server-1",
                ipAddresses = new List<string> { "192.168.1.10" },
                OsType = "Windows"
            };

            var t2 = new Target
            {
                Name = "DB-1",
                ipAddresses = new List<string> { "10.0.0.5" },
                OsType = "Linux"
            };

            var sweeper = new Sweeper();

            sweeper.sweepTarget(t1);
            sweeper.sweepTarget(t2);

            var ioc = new IOC
            {
                value = "192.168.1.10"
            };

            var matched = sweeper.matchIOC(ioc);

            return Content($"IOC Matched? {matched}");
        }

    }
}
