using Microsoft.EntityFrameworkCore;
using Milo.API.Data;

namespace Milo.API.Services;

public class DailyUsersReportService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DailyUsersReportService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1); // Check every minute
    private readonly TimeSpan _targetTime = new TimeSpan(8, 0, 0); // 08:00 SAST (06:00 UTC)

    public DailyUsersReportService(IServiceProvider serviceProvider, ILogger<DailyUsersReportService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Daily Users Report Service started. Will send report at 08:00 SAST (06:00 UTC) daily.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var currentTime = now.TimeOfDay;
                
                // Check if it's time to send the report (08:00 SAST = 06:00 UTC)
                // Allow a 1-minute window to account for timing
                if (currentTime >= _targetTime && currentTime < _targetTime.Add(TimeSpan.FromMinutes(1)))
                {
                    _logger.LogInformation("Time to send daily users report!");
                    await SendDailyReportAsync();
                    
                    // Wait until next day to avoid sending multiple times
                    var tomorrow = now.Date.AddDays(1).Add(_targetTime);
                    var waitTime = tomorrow - now;
                    if (waitTime > TimeSpan.Zero)
                    {
                        await Task.Delay(waitTime, stoppingToken);
                    }
                }
                else
                {
                    await Task.Delay(_checkInterval, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Daily Users Report Service");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Wait 5 minutes on error
            }
        }
    }

    private async Task SendDailyReportAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<MiloDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        try
        {
            _logger.LogInformation("Fetching all users for daily report...");

            // Get all users
            var users = await dbContext.Users
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserReportData
                {
                    Name = u.Name,
                    Email = u.Email,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            _logger.LogInformation($"Found {users.Count} users. Sending daily report to ico@astutetech.co.za");

            var emailSent = await emailService.SendDailyUsersReportEmailAsync("ico@astutetech.co.za", users);

            if (emailSent)
            {
                _logger.LogInformation($"✓ Daily users report sent successfully to ico@astutetech.co.za");
            }
            else
            {
                _logger.LogWarning($"✗ Daily users report was not sent - email service returned false");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"✗ FAILED to send daily users report. Error: {ex.Message}");
        }
    }
}
