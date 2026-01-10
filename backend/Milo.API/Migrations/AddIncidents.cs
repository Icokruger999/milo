using FluentMigrator;

namespace Milo.API.Migrations;

[Migration(20260111001)] // Timestamp: 2026-01-11 00:01
public class AddIncidents : Migration
{
    public override void Up()
    {
        Create.Table("incidents")
            .WithColumn("id").AsInt32().PrimaryKey().Identity()
            .WithColumn("incident_number").AsString(50).NotNullable().Unique()
            .WithColumn("subject").AsString(200).NotNullable()
            .WithColumn("description").AsString(int.MaxValue).Nullable()
            .WithColumn("requester_id").AsInt32().NotNullable()
            .WithColumn("agent_id").AsInt32().Nullable()
            .WithColumn("group_id").AsInt32().Nullable()
            .WithColumn("department").AsString(100).Nullable()
            .WithColumn("status").AsString(50).NotNullable().WithDefaultValue("New")
            .WithColumn("priority").AsString(50).NotNullable().WithDefaultValue("Low")
            .WithColumn("urgency").AsString(50).Nullable()
            .WithColumn("impact").AsString(50).Nullable()
            .WithColumn("source").AsString(50).Nullable()
            .WithColumn("category").AsString(100).Nullable()
            .WithColumn("sub_category").AsString(100).Nullable()
            .WithColumn("created_at").AsDateTime().NotNullable()
            .WithColumn("updated_at").AsDateTime().Nullable()
            .WithColumn("resolved_at").AsDateTime().Nullable()
            .WithColumn("closed_at").AsDateTime().Nullable()
            .WithColumn("planned_start_date").AsDateTime().Nullable()
            .WithColumn("planned_end_date").AsDateTime().Nullable()
            .WithColumn("planned_effort").AsString(50).Nullable()
            .WithColumn("first_response_due").AsDateTime().Nullable()
            .WithColumn("resolution_due").AsDateTime().Nullable()
            .WithColumn("first_response_at").AsDateTime().Nullable()
            .WithColumn("tags").AsString(500).Nullable()
            .WithColumn("associated_assets").AsString(int.MaxValue).Nullable()
            .WithColumn("project_id").AsInt32().Nullable()
            .WithColumn("attachments").AsString(int.MaxValue).Nullable()
            .WithColumn("resolution").AsString(int.MaxValue).Nullable();

        // Foreign keys
        Create.ForeignKey("fk_incidents_requester_id")
            .FromTable("incidents").ForeignColumn("requester_id")
            .ToTable("users").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.None); // Restrict

        Create.ForeignKey("fk_incidents_agent_id")
            .FromTable("incidents").ForeignColumn("agent_id")
            .ToTable("users").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.SetNull);

        Create.ForeignKey("fk_incidents_group_id")
            .FromTable("incidents").ForeignColumn("group_id")
            .ToTable("teams").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.SetNull);

        Create.ForeignKey("fk_incidents_project_id")
            .FromTable("incidents").ForeignColumn("project_id")
            .ToTable("projects").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.SetNull);

        // Indexes
        Create.Index("ix_incidents_incident_number")
            .OnTable("incidents")
            .OnColumn("incident_number");

        Create.Index("ix_incidents_status")
            .OnTable("incidents")
            .OnColumn("status");

        Create.Index("ix_incidents_priority")
            .OnTable("incidents")
            .OnColumn("priority");

        Create.Index("ix_incidents_created_at")
            .OnTable("incidents")
            .OnColumn("created_at");

        Create.Index("ix_incidents_project_id")
            .OnTable("incidents")
            .OnColumn("project_id");

        Create.Index("ix_incidents_requester_id")
            .OnTable("incidents")
            .OnColumn("requester_id");
    }

    public override void Down()
    {
        // Drop foreign keys first
        Delete.ForeignKey("fk_incidents_requester_id").OnTable("incidents");
        Delete.ForeignKey("fk_incidents_agent_id").OnTable("incidents");
        Delete.ForeignKey("fk_incidents_group_id").OnTable("incidents");
        Delete.ForeignKey("fk_incidents_project_id").OnTable("incidents");

        // Drop indexes
        Delete.Index("ix_incidents_incident_number").OnTable("incidents");
        Delete.Index("ix_incidents_status").OnTable("incidents");
        Delete.Index("ix_incidents_priority").OnTable("incidents");
        Delete.Index("ix_incidents_created_at").OnTable("incidents");
        Delete.Index("ix_incidents_project_id").OnTable("incidents");
        Delete.Index("ix_incidents_requester_id").OnTable("incidents");

        // Drop table
        Delete.Table("incidents");
    }
}
