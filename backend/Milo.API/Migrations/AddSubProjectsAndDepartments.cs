using Microsoft.EntityFrameworkCore.Migrations;

namespace Milo.API.Migrations;

public class AddSubProjectsAndDepartments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Create Departments table
        migrationBuilder.CreateTable(
            name: "Departments",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                ProjectId = table.Column<int>(type: "integer", nullable: false),
                Color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false, defaultValue: "#6554C0"),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Departments", x => x.Id);
                table.ForeignKey(
                    name: "FK_Departments_Projects_ProjectId",
                    column: x => x.ProjectId,
                    principalTable: "Projects",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        // Create SubProjects table
        migrationBuilder.CreateTable(
            name: "SubProjects",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                ProjectId = table.Column<int>(type: "integer", nullable: false),
                DepartmentId = table.Column<int>(type: "integer", nullable: true),
                Color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false, defaultValue: "#0052CC"),
                StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                TimelineStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                TimelineEndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                TimelineX = table.Column<int>(type: "integer", nullable: true),
                TimelineY = table.Column<int>(type: "integer", nullable: true),
                TimelineWidth = table.Column<int>(type: "integer", nullable: true),
                TimelineHeight = table.Column<int>(type: "integer", nullable: true),
                OnTimeline = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                Duration = table.Column<int>(type: "integer", nullable: true),
                CustomText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SubProjects", x => x.Id);
                table.ForeignKey(
                    name: "FK_SubProjects_Departments_DepartmentId",
                    column: x => x.DepartmentId,
                    principalTable: "Departments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_SubProjects_Projects_ProjectId",
                    column: x => x.ProjectId,
                    principalTable: "Projects",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        // Add SubProjectId column to Tasks table
        migrationBuilder.AddColumn<int>(
            name: "SubProjectId",
            table: "Tasks",
            type: "integer",
            nullable: true);

        // Add foreign key for SubProjectId
        migrationBuilder.CreateIndex(
            name: "IX_SubProjects_DepartmentId",
            table: "SubProjects",
            column: "DepartmentId");

        migrationBuilder.CreateIndex(
            name: "IX_SubProjects_ProjectId",
            table: "SubProjects",
            column: "ProjectId");

        migrationBuilder.CreateIndex(
            name: "IX_Departments_ProjectId",
            table: "Departments",
            column: "ProjectId");

        migrationBuilder.CreateIndex(
            name: "IX_Tasks_SubProjectId",
            table: "Tasks",
            column: "SubProjectId");

        migrationBuilder.AddForeignKey(
            name: "FK_Tasks_SubProjects_SubProjectId",
            table: "Tasks",
            column: "SubProjectId",
            principalTable: "SubProjects",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drop foreign key
        migrationBuilder.DropForeignKey(
            name: "FK_Tasks_SubProjects_SubProjectId",
            table: "Tasks");

        // Drop index
        migrationBuilder.DropIndex(
            name: "IX_Tasks_SubProjectId",
            table: "Tasks");

        // Drop column
        migrationBuilder.DropColumn(
            name: "SubProjectId",
            table: "Tasks");

        // Drop tables
        migrationBuilder.DropTable(
            name: "SubProjects");

        migrationBuilder.DropTable(
            name: "Departments");
    }
}
