using Microsoft.AspNetCore.Mvc;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    [HttpGet]
    public IActionResult GetProjects()
    {
        // TODO: Implement project retrieval
        return Ok(new { message = "Projects endpoint - coming soon" });
    }

    [HttpGet("{id}")]
    public IActionResult GetProject(int id)
    {
        // TODO: Implement single project retrieval
        return Ok(new { id, message = "Project endpoint - coming soon" });
    }

    [HttpPost]
    public IActionResult CreateProject([FromBody] object project)
    {
        // TODO: Implement project creation
        return CreatedAtAction(nameof(GetProject), new { id = 1 }, project);
    }
}

