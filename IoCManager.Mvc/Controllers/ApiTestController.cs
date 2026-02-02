using Microsoft.AspNetCore.Mvc;

namespace IoCManager.Mvc.Controllers
{
    public class ApiTestController : Controller
    {
        private readonly IHttpClientFactory _factory;

        public ApiTestController(IHttpClientFactory factory)
        {
            _factory = factory;
        }

        public async Task<IActionResult> Index()
        {
            var client = _factory.CreateClient("IocApi");

            // هذا endpoint موجود عندك حسب Swagger
            var response = await client.GetAsync("/api/Iocs");

            return Content(
                $"StatusCode: {(int)response.StatusCode} - {response.StatusCode}"
            );
        }
    }
}
