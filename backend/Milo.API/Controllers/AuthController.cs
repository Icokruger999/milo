using Microsoft.AspNetCore.Mvc;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    // Temporary hardcoded user for development
    // TODO: Replace with database authentication
    private const string ValidEmail = "info@streamyo.com";
    private const string ValidPassword = "Stacey@1122";

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { message = "Email and password are required" });
        }

        // Validate credentials
        if (request.Email.Equals(ValidEmail, StringComparison.OrdinalIgnoreCase) && 
            request.Password == ValidPassword)
        {
            // Generate a simple token (in production, use JWT)
            var token = Guid.NewGuid().ToString();
            
            return Ok(new
            {
                success = true,
                token = token,
                user = new
                {
                    email = request.Email,
                    name = "StreamYo User"
                },
                message = "Login successful"
            });
        }

        return Unauthorized(new { message = "Invalid email or password" });
    }

    [HttpPost("verify")]
    public IActionResult VerifyToken([FromBody] TokenRequest request)
    {
        // Simple token verification (in production, use JWT validation)
        if (!string.IsNullOrEmpty(request.Token))
        {
            return Ok(new { valid = true });
        }

        return Unauthorized(new { valid = false });
    }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class TokenRequest
{
    public string Token { get; set; } = string.Empty;
}

