using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Milo.API.Data;
using Milo.API.Models;

namespace Milo.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly MiloDbContext _context;

    public ProductsController(MiloDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        var products = await _context.Products
            .Where(p => p.Status != "archived")
            .OrderBy(p => p.Name)
            .ToListAsync();

        return Ok(products.Select(p => new
        {
            id = p.Id,
            name = p.Name,
            description = p.Description,
            status = p.Status,
            createdAt = p.CreatedAt
        }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
        {
            return NotFound(new { message = "Product not found" });
        }

        return Ok(new
        {
            id = product.Id,
            name = product.Name,
            description = product.Description,
            status = product.Status,
            createdAt = product.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        if (request == null || string.IsNullOrEmpty(request.Name))
        {
            return BadRequest(new { message = "Name is required" });
        }

        var product = new Product
        {
            Name = request.Name,
            Description = request.Description,
            Status = request.Status ?? "active",
            CreatedAt = DateTime.UtcNow
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, new
        {
            id = product.Id,
            name = product.Name,
            description = product.Description,
            status = product.Status,
            createdAt = product.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductRequest request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
        {
            return NotFound(new { message = "Product not found" });
        }

        if (!string.IsNullOrEmpty(request.Name))
        {
            product.Name = request.Name;
        }
        if (request.Description != null)
        {
            product.Description = request.Description;
        }
        if (!string.IsNullOrEmpty(request.Status))
        {
            product.Status = request.Status;
        }

        product.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = product.Id,
            name = product.Name,
            message = "Product updated successfully"
        });
    }
}

public class CreateProductRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Status { get; set; }
}

public class UpdateProductRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
}

